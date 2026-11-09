<!-- GENERATED from book/latex/sources/appendix-evidence-ledger/evidence-tables.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## G.2 Build Scale and Repository Motion

The following measurements preserve earlier repository windows and counting rules. They are historical receipts, not the data behind the revised 31-week figures in {{sec:inside-docables-software-factory}}. The consistently categorized March–October reconstruction appears in G.9 below. Keeping the windows separate prevents a change in counting procedure from appearing to be a change in the factory.

### G.2.1 Weekly Commit Volume {#velocity}

Weekly commit volume rose sharply as the agent fleet expanded, exceeded {{commits_per_week}} commits per week during sustained high-volume periods, and briefly exceeded 3,000. Volume declined through the interval {{chapter:software-factories}} identifies as hardening, then rose again.

During hardening, a larger share of classified commits concerned models, validation, tests, and control machinery. Commit counts do not establish why volume changed or whether productivity rose or fell.[^g-vacation] [ref:velocity-curve] plots the weekly series.

<!-- label: velocity-curve -->
<!-- figure: assets/velocity-commits-per-week.svg | *Weekly Commit Volume.* Commits per week across the project history. Bar height measures repository activity, not engineering productivity; interpreting the hardening interval requires classifying the work represented by those commits. -->

<!-- FUTURE: When available, add Epics-closed/week and reopens/week — either onto Figure H-1 or immediately after it. Commits measure activity; completed engineering units are a complementary measure closer to durable throughput. Insert the planned reviewer-capacity bound here once measured, and keep it a sensitivity analysis rather than an assertion about actual review speed. -->

### G.2.2 Support-Apparatus Ratio {#support-ratio}

Production and support-apparatus source were counted at five dated repository states across the seven primary source roots. The counting procedure fails if an expected root is absent. These counts supported an earlier support-ratio series. They are not the source of the current 31-week composition figure.

The first four rows are historical states and are recorded as measured. The last row uses the earlier series’ declared endpoint and token registry. Its endpoint and categories differ from the frozen 31-week reconstruction in G.9; it must be read within this historical series.

<!-- label:  -->
<!-- table:  -->
| Window                      | Production LoC | Support LoC    | Support ratio   |
|----------------------------|---------------|---------------|----------------|
| Prototype — Apr. 9          | 26,956 | 22,908 | 0.85× |
| Mechanization — May 31      | 302,844 | 751,050 | 2.48× |
| Hardening — Jun. 30         | 337,905 | 1,244,194 | 3.68× |
| Study close — Aug. 3        | 491,090 | 1,501,907 | 3.06× |
| Window end — {{window_end_display}} | {{prod_loc}} | {{support_loc}} | {{support_ratio}}× |

Support-apparatus source began below parity with production source, crossed it by the mechanization snapshot, peaked at 3.68× during hardening, and fell to 3.06× by the Aug. 3 study close. It stood at {{support_ratio}}× at the window end, still below the hardening peak.

These counts describe how source was distributed in this repository. The ratio is not a measure of engineering value, engineering-capital return, or a recommended target for another project.

### G.2.3 Product-Path Line Motion {#churn}

Lines added and deleted were counted over four windows for the two principal product paths:

- **`web/`** — the Python service and worker.
- **`backend/`** — the C# tool and rule engine.

Source: `git numstat` over the dated commit windows.

<!-- label:  -->
<!-- table:  -->
| Window | web/ added | web/ deleted | backend/ added | backend/ deleted |
|---|---|---|---|---|
| Prototype | 22,539 | 7,717 | 48,636 | 10,166 |
| Mechanization | 371,855 | 161,044 | 941,120 | 286,378 |
| Hardening | 179,649 | 33,983 | 109,188 | 3,767 |
| Loop management | 96,825 | 14,332 | 116,313 | 9,708 |

The mechanization window contains the largest add-and-delete volume, particularly in `backend/`. Deletions fall sharply in the later windows, and both paths become strongly net-additive. [ref:churn-per-path] plots these counts.

These counts are a repository-motion proxy, not the theoretical concept of churn used elsewhere in the book. Generated bundles and vendored trees are included where they occur; {{chapter:software-factories}}'s accounting note describes that bounded inflation.

<!-- label: churn-per-path -->
<!-- figure: assets/churn-per-path.svg | *Product-Path Line Motion.* Lines added above the baseline and deleted below it, by path and study window. Mechanization contains the largest observed line motion. The later reduction in deletions is consistent with less structural rewriting but does not establish its cause. -->

### G.2.4 Growth of Countable Controls {#control-growth}

Project-specific lint files and gate scripts were counted at four repository states, using `git ls-tree` at the corresponding window SHA.

<!-- label:  -->
<!-- table:  -->
| Window        |      Lint files |    Gate scripts |
|--------------|----------------:|----------------:|
| Prototype     | 0 | 0 |
| Mechanization | 336 | 20 |
| Hardening     | 595 | 76 |
| Study close   | 747 | 102 |

This series stops at the study close. Its windows are repository SHAs rather than calendar dates, and the counting rule for gate scripts is not recorded, so it cannot be extended to the window endpoint the way the support-ratio series above was.

Both counted surfaces begin at zero in the prototype snapshot. At the study close, the 747 lint files contain 993 registered lint specifications.

Two further repository counts show that at least some controls were created in response to observed failures:

- **Paired fix-and-lint tags** — 208 commits carry one.
- **Incident-named lints** — 27 lints name a specific dated incident in their text; spot checks confirmed that the sampled cases linked an observed failure to the resulting control.

These counts show both the growth of project-specific control machinery and a subset of cases where failures led to new controls. They do not show what fraction of all controls originated in failures rather than being designed prospectively, and raw control counts do not measure their value.

<!-- FUTURE: If practical, add the exact counting rule for fix-and-lint tags and incident-linked lints. A useful later complement would be the number of controls exercised after introduction — inventory and realized use are different quantities. -->

## G.3 Model Correspondence and Drift

The measurements in this section concern model↔code correspondence only. Documentation drift is counted separately in G.3.5 and is excluded from the model-sync claim.

The underlying question is narrow. After explicit models became reasoning surfaces, did model↔implementation drift occur, could derived checks detect it, and did the observed class recur after close?

### G.3.1–G.3.4 Correspondence Results {#model-sync-evidence}

<!-- label:  -->
<!-- table:  -->
| Claim | Measurement | Result | Limitation |
|---|---|---|---|
| Model↔code drift existed before the derived floor | Re-run each closed Epic's own lints against its closed state; classify findings by hand | Approximately 27 genuine model↔code drifts, including a production-blocking pointer drift and a fully typed function with zero consumers | Manual classification; no independently specified oracle |
| Derived checks catch fresh drift | Re-run the derived floor at HEAD | 6 genuine catches: three traceability failures and three stale-anchor or stale-test failures | Small N; measures only governed surfaces |
| Post-close recurrence of modeled, mechanically decidable drift | Census over 56 cumulative Epic closes | 0 observed across 56 cumulative Epic closes | Finite observation window; does not cover semantic or unmodeled drift |
| Checks were exercised during continuing model-bridge change | `git numstat` over one week for the query/reactor, governance-graph, and frontend-build models | +8,970 / −173 lines across 63 commits | Line motion is a change-load proxy, not a measure of semantic difficulty |

Manual review classified all approximately 27 pre-floor findings as genuine model↔code drift. Because that classification relied on human judgment rather than an independent criterion, the result establishes that drift existed before the floor, not the detector's precision.

The six HEAD catches were an unregistered model consumer, a missing component entry, a service-call-graph mismatch, and three stale-anchor or stale-test cases. A symbol-anchored drift lint, a consumer-registry-freshness check, and a service-call-graph drift lint detected them.

Taken together, these observations establish a bounded within-case sequence: model↔code drift existed before the derived checks; the checks caught six fresh instances; and the modeled, mechanically decidable class did not recur across 56 closes during the measured window. They do not establish that the class was eliminated or that the mechanism prevents model drift.

### G.3.5 Documentation Drift — Excluded from the Model-Sync Claim {#doc-hygiene-aside}

Stale headers and stale prose numbers are documentation drift, not model↔code drift. They are counted separately because folding them into the correspondence measurements would inflate the model-sync evidence.

<!-- label:  -->
<!-- table:  -->
| Documentation drift | Refresh-window count | Detected by | Resolution |
|---|---|---|---|
| Status header frozen at a pre-close phase | 11 | Reading by a person or capable model | Close tooling rewrites the status atomically |
| Stale prose number after the implementation moved past it | 9 | Model re-deriving the number from code | Routed one-line fix or audit finding |

These observations concern prose that no derived correspondence check parses. They therefore say nothing about whether a model remains synchronized with implementation.

### G.3.6 Scope of the Model-Sync Claim {#model-sync-honest-reading}

The correspondence mechanisms cover only modeled, mechanically decidable relationships, and the observed N is small. A semantic mismatch whose anchors still resolve may remain judgment-dependent, and an unmodeled region has no model-correspondence check at all.

The results are therefore field observations about one governed surface, not a general catch rate or a proof of model correctness. Three cases stay distinct:

- **Derived correspondence** — machinery can re-establish it from current artifacts.
- **Semantic correspondence** — it may still require judgment.
- **Unmodeled regions** — no model claim exists for them yet.

## G.4 Model Coverage {#missing-model-drain}

The traceability tracer measures the fraction of exercised code with no corresponding model claim. Repeated runs identified portions of the exercised surface that stayed outside the explicit model structure. Across the recorded sequence, the unmodeled fraction fell from {{missing_model_pilot_percent}} on the first run to 7.89% on the ninth.

<!-- label:  -->
<!-- table:  -->
| Run | Unmodeled exercised surface | Note |
|---|---|---|
| First | {{missing_model_pilot_percent}} | Majority of exercised code traced to no model claim |
| Intermediate runs | declining | Successive model-loop Epics targeted large remaining orphan clusters |
| Ninth | 7.89% | Remaining orphan surface was small and explicitly identified |

Three qualifications matter.

- **Coverage, not quality.** The metric measures coverage, not model quality. Code may trace to a model claim that is itself incomplete or poorly chosen.
- **Operator-directed decline.** Each model-loop Epic targeted a large remaining orphan cluster. The decline reflects deliberate modeling work, not autonomous convergence.
- **Not all orphans are debt.** An unmodeled exercised symbol may be a genuinely missing model, a missing anchor on an existing model, or implementation detail below the grain the model should represent. Backward tracing from exercised symbols to expected model edges distinguished these cases; only the first two necessarily call for more modeling. The unmodeled fraction measures absence of explicit representation, not engineering deficiency: the remainder may include unknown obligations, tacit obligations, and deliberately preserved degrees of freedom. MAGE does not prescribe zero as the target.

<!-- FUTURE: Recover and publish all nine measurements, including denominator or relevant traceability counts if available. The present endpoint-only series supports the endpoint claim but is not yet the raw series the ledger ideally promises. -->

## G.5 Representation and Navigation Cost {#nav-pilot}

A small exploratory pilot tested whether a model-derived navigation surface reduced the context an agent consumed while determining where to look in the repository.

Across four tasks, model-guided navigation reduced reconstruction-token cost by a median of roughly 35% relative to the from-scratch condition, with no observed loss of task-level correctness.

<!-- label:  -->
<!-- table:  -->
| Measure | Baseline | Model-guided | Interpretation |
|---|---|---|---|
| Tasks | 4 | 4 | N too small for generalization |
| Reconstruction-token cost | Full baseline | \~35% lower median | Directional evidence of reduced reconstruction effort |
| Recorded correctness | Reference condition | No observed loss | The existing pilot does not support a general equivalence claim |

The tasks were not independently sampled, and N=4 is too small to estimate a general effect. Within this small pilot, the result is consistent with the proposed mechanism: an explicit representation may reduce how much lower-level structure an agent must reconstruct before acting.

<!-- FUTURE: Supersede this subsection with the larger paired experiment already specified for the orchestrator — do not supplement it with another subsection. When those results exist, report task-level paired observations, tokens, tool/navigation calls, files opened, wall-clock time, and independently judged task success. -->

## G.6 Cost and Scale Receipts {#cost-receipt}

These are earlier, differently scoped estimates. In particular, the approximately $60,000 development figure concerns a roughly 20-week account. The later six-month estimate used in {{sec:inside-docables-software-factory}} is approximately $110,000, consisting of $90,000 engineering labor and $20,000 cloud expenditure. Both are author-supplied estimates, not independently audited accounting; G.9 records the later evaluation separately.

These quantities establish orders of magnitude relevant to the {{chapter:software-factories}} discussion. Their units, scopes, and cost categories differ; they are not entries in a comparative cost model.

<!-- label:  -->
<!-- table:  -->
| Quantity | Observed or estimated value | Basis |
|---|---|---|
| Accessibility-checker findings in a representative deck | 42 | One graduate instructional deck evaluated with the built-in accessibility checker |
| Manual remediation, one teaching load | ≈ {{diy_cost_per_course}} estimated faculty labor | Findings/deck × minutes/finding × decks/course × loaded hourly rate |
| Vendor remediation | $3–$40 / page | Market range collected during the study; not staffed for graduate-level subject annotation |
| Automated processing, one representative deck | ≈ 1 minute; ≈ $1 direct processing cost | Warm-start service near the end of the study period |
| Direct development cost | ≈ $60,000 | Roughly 20-week study; majority salary |

The manual-remediation estimate and automated-processing figure use different units and cost categories. One estimates faculty labor across a teaching load; the other records direct processing cost for one representative deck. They indicate scale but are not a controlled cost comparison.

The vendor range is a market observation, not a quality-adjusted comparison with DocAble. The development-cost figure is an order-of-magnitude direct-cost estimate, not audited project accounting.

<!-- FUTURE: Expand the ≈$20,000 estimate into its actual arithmetic once the underlying values are recovered. Attach provenance to the $3–$40/page vendor range. Break the ≈$60,000 direct-development estimate into salary, model/API, cloud, and other direct costs if those records are available. Add paired institutional-checker outcomes if available, and keep the resulting claim narrow — checker improvement is evidence about checker-detectable accessibility properties, not the complete experience of a disabled user. -->

## G.7 Measurement Without Enforcement {#measurement-seed}

A measurement can be useful before it deserves enforcement.

### G.7.1 Provisional Cost-and-Time Model

A per-chunk worst-case cost-and-time estimate was recorded as a timestamped provisional model rather than embedded as a permanent code constant.

Current instrumentation can report when an operation would exceed the provisional budget. Production admission does not depend on that estimate, because the observation base is not yet strong enough to justify a blocking threshold.

The provisional bound need not be correct to be useful. The system keeps the stages separate: **observation → representation → reporting**. Because the evidence is insufficient, the estimate does not become a gate.

<!-- FUTURE: If the exact seed observations become stable enough to publish, add them here. Otherwise retain this subsection as a provenance note, and do not imply quantitative calibration the ledger does not contain. -->

### G.7.2 Warm Endpoint Latency and a Resident-Runtime Prototype

A July 23, 2026 engineering record distinguishes two measurements that an earlier account conflated. The production conformance endpoint measured 4,057 ms with a warm container and 6,628 ms cold. Even the warm path launched a Java virtual machine for each request. Changing the number of warm container instances would not remove that recurring subprocess-launch cost.

A toy Cloud Run service kept the Java runtime resident and measured 108.9 ms for a warm response. This comparison supported a resident-runtime redesign, but did not establish the production improvement under matched conditions. The primary record identifies the endpoint measurements under commit `436ef74899` and the prototype comparison under `d8c0ab3fa1`.

The contrast with G.7.1 concerns the engineering decision justified by the evidence: a recurring implementation cost motivated an architectural change, while a weakly calibrated rejection bound remained advisory. Neither case establishes that every useful measurement should become a gate.

## G.8 What This Ledger Does Not Measure {#does-not-measure}

Most quantities in this appendix are activity, structural, or within-case mechanism measures:

- commits and line motion;
- source distribution;
- control counts;
- model coverage;
- correspondence catches and reopens;
- exploratory navigation cost;
- selected financial and runtime observations.

These are not direct estimates of the broader outcomes needed to compare MAGE with another engineering process: durable throughput, defect escape, human-attention burden, or total cost of ownership. The case follows one production system, one primary engineer directing an agent fleet, and one contemporary model ecosystem; it did not collect those outcomes under a controlled counterfactual. The measurements therefore establish what happened within the case and which mechanisms were exercised, not the effects another organization should expect from adopting MAGE.

The ledger's narrower purpose is traceability: the quantitative claims in {{chapter:software-factories}} can be inspected independently of the surrounding argument.

## G.9 Current-Window DocAble Measurements {#docable-seip-current-window}

This receipt records the data used in the revised {{sec:inside-docables-software-factory}}, drawn from the DocAble study’s manuscript sources and generated summaries.[cite: davis2026docable] It does not merge them with the historical windows above. The engineering reconstruction covers 31 complete seven-day weeks, March 12–October 14, 2026; the evaluation uses a separate held-out document partition. The factory workflow described as of November 3 is later than the engineering measurement window.

### G.9.1 Longitudinal Definitions and Coverage {#seip-longitudinal-protocol}

Work commits are dated by landing, not by inferred implementation time. The reconstruction expands squash landings into source commits, deduplicates hashes, and excludes merges, empty commits, and integration bookkeeping. Preserved worktree references recover truncated source lists. Thirty-three source objects remain unavailable and one squash has no source list, so the 36,578-commit series is incomplete.

Epic completion counts require a dated affirmative whole-Epic completion claim. Directory moves, administrative retirement, and phase dates alone do not establish completion. The mining pass examined 638 distinct roots in the closed directory: 448 had dated completion claims, of which 428 fell in the complete window; 74 were administrative retirements and 116 lacked unambiguous completion evidence. These are documented claims, including accepted scoped research, rather than independent outcome audits. No completion records were recovered for weeks 1–10.

Dispatch IDs are deduplicated across startup sentinels, archived dispatch markers, and preserved registry registrations, using the earliest explicit start or dispatch date. Archive filenames and termination dates are not launch dates. No records were recovered for weeks 1–11, and later retention varies. Missing or sparse records cannot establish an absence of work or a change in the underlying launch rate.

<!-- label: work-over-time -->
<!-- table: Activity recovered in the 31 complete weeks. Totals describe retained records under the stated counting rules, not productivity or independently verified engineering outcomes. [short: Activity and coverage in the current window] -->
| Series | Count | Main coverage limit |
|---|---|---|
| Landed work commits | {{seip_commits}} | 33 unavailable source objects; one unresolved squash |
| Agent dispatch IDs | {{seip_dispatches}} | No recovered records in weeks 1–11; uneven later retention |
| Epic completion claims | {{seip_completions}} | No recovered records in weeks 1–10; incomplete completion evidence |

Model identities are top-level Python modules that declared `MODEL_KIND` at a sampled snapshot. Earlier existence is reconstructed by path, so the later declaration convention does not create a false growth discontinuity. Models never given that declaration are outside the inventory. Multi-model consumers are distinct registered consumers of at least two models, not counts of relational operations.

The static and dynamic verifier counts resolve declared references to existing files and deduplicate paths within each class. They exclude computed references and unregistered consumers, and do not count every test, test case, or execution. A registered file establishes available checking machinery, not a successful check run.

<!-- label: control-growth-curve -->
<!-- table: Model-linked artifacts at the last complete week. These counts establish represented structure and registered checking files, not correctness or execution. [short: Model-linked artifacts at week 31] -->
| Artifact               |          Count |
|-----------------------|---------------:|
| Model modules          | {{seip_models}} |
| Multi-model consumers  | {{seip_consumers}} |
| Static verifier files  | {{seip_static}} |
| Dynamic verifier files | {{seip_dynamic}} |

The week-11 interpretation combines field notes from May 22 and 24 with a transparent query over commit subjects mentioning linting, typing, and associated analysis tools. It supports an account of a hardening campaign. It does not isolate a causal effect on productivity, nor date the first use of agents, planning, or checks from the first surviving records.

### G.9.2 Production, Apparatus, and Support Ratio {#seip-support-composition}

The current size series uses ten week-end snapshots and one fixed category mapping. `cloc` separates code from comments and blank lines. Early source roots are mapped to their later equivalents; overlapping report paths are assigned to the longest matching path, and per-file output checks that categories are disjoint. Dependencies, generated frontend copies, historical worktrees, and snapshot documentation are excluded. Indexed documentation must belong to a snapshot’s living-document indexes; changes in that convention can affect its series.

Production comprises remediation, web processing, frontend, and shared services. Apparatus comprises tests, lints, tools, agent infrastructure, infrastructure-as-code, model metadata, and indexed documentation. The ratio is apparatus divided by production. Lines drawn between sampled revisions interpolate observations rather than adding measurements.

<!-- label:  -->
<!-- table: Consistently categorized production and apparatus counts from the current reconstruction. The support ratio describes source investment rather than its value or a recommended target. [short: Current-window support ratio] -->
| Snapshot | Production lines | Apparatus lines | Apparatus / production |
|---------|-----------------|----------------|-----------------------|
| Week 1   | 1,577  | 0 | 0.00        |
| Week 5   | 42,344  | 55,072 | 1.30        |
| Week 9   | 233,586  | 361,866 | 1.55        |
| Week 11  | 277,417  | 711,039 | 2.56        |
| Week 13  | 285,265  | 917,527 | 3.22        |
| Week 17  | 293,799  | 1,325,221 | 4.51        |
| Week 21  | 440,973  | 1,577,492 | 3.58        |
| Week 25  | 516,024  | 1,807,695 | 3.50        |
| Week 29  | 579,841  | 2,104,013 | 3.63        |
| Week 31  | {{seip_prod_loc}}   | {{seip_apparatus_loc}}  | {{seip_support_ratio}}         |

### G.9.3 Human-Reference Evaluation {#docable-human-reference-protocol}

The institutional collection contains {{seip_uta_pairs}} identifiable original/remediated pairs from {{seip_uta_courses}} courses. The {{seip_uta_workers}} trained undergraduates billed {{seip_uta_hours}} hours across approximately six months. Dividing hours by recovered pairs gives {{seip_uta_hours_per_pair}} hours per pair. At the assumed typical wage of ${{seip_uta_hourly_wage}} per hour, the estimate is ${{seip_uta_cost_per_pair}} in direct labor per pair. Identifiable pairs need not represent all work performed; the arithmetic is not a record of per-document labor or payroll.

Format and matching eligibility yielded {{seip_eval_eligible}} pairs. A randomized document-level split stratified by format assigned {{seip_eval_development}} to development and {{seip_eval_attempts}} to validation: 29 DOCX, 22 PPTX, 11 PDF, and one XLSX. The spreadsheet had prior development exposure. DocAble completed {{seip_eval_completed}} attempts and failed on one PDF; the failed partial artifact is excluded from completed-output comparisons.

Syntactic percentages use 100 × (original findings − output findings) / original findings, calculated separately per document and summarized by the median. Originals with no findings are excluded from percentages but retained when counting documents whose findings increased. Negative reductions remain negative. These are net count changes, not identity-matched newly introduced or resolved defects. Office counts include manual-review advisories and may flag the same object under several rules.

<!-- label:  -->
<!-- table: Median per-document reduction in checker findings; the human and DocAble conditions use the same completed triples within each format. [short: Human-reference checker reductions] -->
| Format | Positive-baseline triples | Human reduction | DocAble reduction | Triples with increased findings, human / DocAble |
|---|---|---|---|---|
| PDF | 10 | 60.7% | 94.1% | 0/10 / 0/10 |
| DOCX | 25 | 66.7% | 75.0% | 0/29 / 0/29 |
| PPTX | 21 | 84.8% | 34.3% | 1/22 / 1/22 |
| XLSX | 0 | Undefined | Undefined | 0/1 / 0/1 |

Giving the failed PDF zero improvement yields a 90.4% median across all eleven assigned PDFs. That sensitivity gives failure no benefit; it is not a measured score for the partial artifact. Microsoft’s checker changed between the students’ summer remediation and the October evaluation. All document versions were assessed with the current instruments. Other supported formats, including ODF, LaTeX, and Typst, were not part of this comparison.

The semantic procedure used GPT-5.2 judgments over text transcripts, randomized A/B labels for the two outputs, and the original as a third anchor. Criteria were drawn from standards and checker rules, but the weighting and one-point parity band were project methods. The model assigned criterion outcomes and transcript evidence; a deterministic scorer compared improvements and regressions against the original. Unconfirmed heuristic evidence was capped at minor severity. Unchanged and inconclusive judgments contributed no points.

The rubric was developed on the development partition. Two validation passes used the resulting method without intervening revisions. The second pass had complete criterion records and yielded {{seip_eval_semantic_better}} better, {{seip_eval_semantic_parity}} parity, and {{seip_eval_semantic_worse}} worse scores for DocAble among {{seip_eval_completed}} outputs. The passes agreed on {{seip_eval_repeat_agreement}} document classifications; four crossed parity-band boundaries, with a maximum two-point change in the DocAble-minus-human difference. This assesses procedural consistency, not expert validity.

Of {{seip_eval_rubric_rows}} criterion rows, {{seip_eval_inconclusive}} were inconclusive for DocAble, including {{seip_eval_adapters_pending}} with automatic adapters pending. The run did not include vision-tier or screen-reader assessments. It did not systematically measure complete preservation or visual fidelity. Gains and regressions in the figure count document–criterion judgments; they are not unique defects, and a net gain can coexist with regressions.

The median runtime was {{seip_eval_runtime_median_minutes}} minutes across all {{seip_eval_attempts}} primary attempts, including failure; the range was approximately 0.10–14.09 minutes. Inference expenditure was measured for {{seip_eval_completed}} completed outputs: median ${{seip_eval_inference_median_usd}}, range approximately ${{seip_eval_inference_min_usd}}–${{seip_eval_inference_max_usd}}. Full cloud and total-cost measurements were unavailable for this cohort. The paper also reports coarse operational estimates of typical inference expenditure; these are distinct from the measured held-out distribution. Subsequent human review and correction were not measured, so these values do not establish labor saved or total institutional savings.

### G.9.4 General-Purpose Agent Comparison {#docable-agent-comparison-receipt}

This separate comparison used ten validation documents and community document tools: five PDFs, two DOCX, two PPTX, and one XLSX. Each agent used one configuration. The spreadsheet had prior development exposure. Original and human-artifact hashes matched the validation corpus, and agent results were joined with DocAble measurements for the same files.

<!-- label: agent-remediation-comparison -->
<!-- table: Medians cover completed attempts in the ten-document cohort. Fable timed out on one PDF. Agent inference costs are cache-aware API-equivalent estimates excluding cloud execution and evaluation. [short: Agent and service remediation comparison] -->
| Method  |          Completed |         Minutes | Inference cost |
|--------|-------------------:|----------------:|---------------:|
| Opus    | 10/10 | 8.22 |         $2.466 |
| Fable   | 9/10 | 7.77 |         $3.977 |
| DocAble | 10/10 | 1.31 |         $0.084 |

The DocAble cost median here is for these ten outputs, not the ${{seip_eval_inference_median_usd}} median over the 62 completed outputs in the main comparison. The paper presents this smaller cohort’s DocAble median more coarsely as less than $0.50.

On the four PDFs completed by all configurations, median checker reductions were 89.7% for Opus, 91.8% for Fable, 100% for DocAble, and 75.3% for human remediation. Both agents exceeded DocAble on the two Word documents; the human workflow led on the two presentations. The spreadsheet had no original findings. These results concern automatic findings, runtime, and inference expenditure. They do not establish comparable semantic quality, and this small comparison cannot isolate a benefit from MAGE or a lasting capability boundary.

[^g-vacation]: On some of these weeks, the author purportedly went on vacation.
