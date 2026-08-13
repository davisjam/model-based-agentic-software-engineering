## G.2 Build Scale and Repository Motion

### G.2.1 Weekly commit volume {#velocity}

Weekly commit volume rose sharply as the agent fleet expanded and reached roughly 1,000 commits per
week during sustained high-volume periods. Volume declined through the interval Part V identifies as
hardening, then rose again.

Commit classification indicates that a larger share of work during the hardening interval concerned
models, validation, tests, and control machinery. The commit counts themselves do not establish why
volume changed, or whether engineering productivity rose or fell. [ref:velocity-curve] plots the weekly
series.

<!-- label: velocity-curve -->
<!-- figure: assets/velocity-commits-per-week.svg | *Weekly Commit Volume.* Commits per week across the project history, one bar per week. The figure measures repository activity. Interpretation of the hardening interval depends on the classification of the work recorded in those commits; bar height alone does not distinguish feature production from engineering-environment work. -->

<!-- FUTURE: When available, add Epics-closed/week and reopens/week — either onto Figure H-1 or immediately after it. Commits measure activity; completed engineering units are a complementary measure closer to durable throughput. Insert the planned reviewer-capacity bound here once measured, and keep it a sensitivity analysis rather than an assertion about actual review speed. -->

### G.2.2 Support-apparatus ratio {#support-ratio}

Production source and support-apparatus source were counted at four dated repository states, using the
fail-loud census over the seven primary source roots. These counts are the source for the support-ratio
curve in Part V.

| Window | Production LoC | Support LoC | Support / production |
|---|---:|---:|---:|
| Prototype — Apr. 9 | 26,956 | 22,908 | 0.85× |
| Mechanization — May 31 | 302,844 | 751,050 | 2.48× |
| Hardening — Jun. 30 | 337,905 | 1,244,194 | 3.68× |
| Final snapshot — Aug. 3 | 491,090 | 1,501,907 | 3.06× |

Support-apparatus source began below parity with production source, crossed it by the mechanization
snapshot, peaked at 3.68× during hardening, and stood at 3.06× at the final snapshot.

These counts describe how source was distributed in this repository. The ratio is not a measure of
engineering value, engineering-capital return, or a recommended target for another project.

### G.2.3 Product-path line motion {#churn}

Lines added and deleted over four windows for the two principal product paths:

- **`web/`** — the Python service and worker.
- **`backend/`** — the C# tool and rule engine.

Source: `git numstat` over the dated commit windows.

| Window | web/ added | web/ deleted | backend/ added | backend/ deleted |
|---|---:|---:|---:|---:|
| Prototype | 22,539 | 7,717 | 48,636 | 10,166 |
| Mechanization | 371,855 | 161,044 | 941,120 | 286,378 |
| Hardening | 179,649 | 33,983 | 109,188 | 3,767 |
| Loop management | 96,825 | 14,332 | 116,313 | 9,708 |

Mechanization contains the largest add-and-delete volume, particularly in `backend/`. Deletions fall
sharply in the later windows, and both paths become strongly net-additive. [ref:churn-per-path] draws
the same shape.

These counts are a repository-motion proxy, not the theoretical concept of churn used elsewhere in the
book. Generated bundles and vendored trees are included where they occur; Part V's accounting note
describes that bounded inflation.

<!-- label: churn-per-path -->
<!-- figure: assets/churn-per-path.svg | *Product-Path Line Motion.* Lines added above the baseline and deleted below it, by path and study window. Mechanization contains the largest restructuring signal. The later reduction in deletions is consistent with less structural rewriting but does not establish its cause. -->

### G.2.4 Growth of countable controls {#control-growth}

Project-specific lint files and gate scripts were counted at four repository states, using `git ls-tree`
at the corresponding window SHA.

| Window | Lint files | Gate scripts |
|---|---:|---:|
| Prototype | 0 | 0 |
| Mechanization | 336 | 20 |
| Hardening | 595 | 76 |
| Final snapshot | 747 | 102 |

Both counted surfaces begin at zero in the prototype snapshot. At the final snapshot, the 747 lint files
contain 993 registered lint specifications.

Two further repository counts show that at least some controls were created in response to observed
failures:

- **Paired fix-and-lint tags** — 208 commits carry one.
- **Incident-named lints** — 27 lints name a specific dated incident in their text; these were
  spot-checked as genuine failure-to-control conversions.

These counts record the growth of project-specific control machinery and document a subset of
failure-driven conversions. They do not establish what fraction of all controls originated in failures
rather than being designed prospectively, and raw control counts do not measure the value of the
resulting mechanisms.

<!-- FUTURE: If practical, add the exact counting rule for fix-and-lint tags and incident-linked lints. A useful later complement would be the number of controls exercised after introduction — inventory and realized use are different quantities. -->

## G.3 Model Correspondence and Drift

The measurements in this section concern model↔code correspondence only. Documentation drift is counted
separately in G.3.5 and is excluded from the model-sync claim.

The underlying question is narrow. After explicit models became reasoning surfaces, did
model↔implementation drift occur, could derived checks detect it, and did the observed class recur after
close?

### G.3.1–G.3.4 Correspondence results {#model-sync-evidence}

| Claim | Measurement | Result | Limitation |
|---|---|---|---|
| Model↔code drift existed before the derived floor | Re-run each closed Epic's own lints against its closed state; classify findings by hand | Approximately 27 genuine model↔code drifts, including a production-blocking pointer drift and a fully typed function with zero consumers | Manual classification; no independently specified oracle |
| Derived checks catch fresh drift | Re-run the derived floor at HEAD | 6 genuine catches: three traceability failures and three stale-anchor or stale-test failures | Small N; measures only governed surfaces |
| Modeled-and-mechanically-decidable drift reached a post-close reopen | Census over 56 cumulative Epic closes | 0 observed post-close reopens for this drift class | Finite observation window; does not cover semantic or unmodeled drift |
| Checks were exercised during continuing model-bridge change | `git numstat` over one week for the query/reactor, governance-graph, and frontend-build models | +8,970 / −173 lines across 63 commits | Line motion is a change-load proxy, not a measure of semantic difficulty |

The pre-floor audit found no false positives among the approximately 27 findings under manual review.
Because classification was performed by hand rather than against an independently specified criterion,
the supported claim is that the audit found a genuine pre-existing drift class — not an estimated
detector precision.

The six HEAD catches were an unregistered model consumer, a missing component entry, a
service-call-graph mismatch, and three stale-anchor or stale-test cases. A symbol-anchored drift lint, a
consumer-registry-freshness check, and a service-call-graph drift lint detected them.

Taken together, these observations support a bounded within-case result. Model↔code drift existed before
the derived correspondence checks; the checks then caught fresh instances; and no post-close recurrence
of the modeled-and-mechanically-decidable class was observed across 56 closes during the measured
window. The measurements do not support the stronger readings that the class was eliminated or that the
mechanism prevents model drift; each of those is a universal claim the data do not reach.

### G.3.5 Documentation drift — excluded from the model-sync claim {#doc-hygiene-aside}

Stale headers and stale prose numbers are documentation drift, not model↔code drift. They are counted
separately because folding them into the correspondence measurements would inflate the model-sync
evidence.

| Documentation drift | Refresh-window count | Detected by | Resolution |
|---|---:|---|---|
| Status header frozen at a pre-close phase | 11 | Reading by a person or capable model | Close tooling rewrites the status atomically |
| Stale prose number after the implementation moved past it | 9 | Model re-deriving the number from code | Routed one-line fix or audit finding |

These observations concern prose that no derived correspondence check parses. They therefore say nothing
about whether a model remains synchronized with implementation.

### G.3.6 Scope of the model-sync claim {#model-sync-honest-reading}

The evidence above is intentionally narrow. The observed N is small. The correspondence mechanisms cover
modeled and mechanically decidable relationships. A semantic mismatch whose anchors still resolve may
remain judgment-dependent, and an unmodeled region has no model-correspondence check at all.

The results are therefore field observations about one governed surface, not a general catch rate or a
proof of model correctness. Three cases stay distinct:

- **Derived correspondence** — machinery can re-establish it from current artifacts.
- **Semantic correspondence** — it may still require judgment.
- **Unmodeled regions** — no model claim exists for them yet.

The documentation counts remain separate because they exercise a different control layer.

## G.4 Model Coverage {#missing-model-drain}

The traceability tracer measures the fraction of exercised code that traces back to no model claim.
Repeated runs identified portions of the exercised surface that stayed outside the explicit model
structure. Across the recorded sequence, the unmodeled fraction fell from 56% on the first run to 7.89%
on the ninth.

| Run | Unmodeled exercised surface | Note |
|---|---:|---|
| First | 56% | Majority of exercised code traced to no model claim |
| Intermediate runs | declining | Successive model-loop Epics targeted large remaining orphan clusters |
| Ninth | 7.89% | Remaining orphan surface was small and explicitly identified |

Three qualifications matter.

- **Coverage, not quality.** The metric measures coverage, not model quality. Code may trace to a model
  claim that is itself incomplete or poorly chosen.
- **Operator-directed decline.** Each model-loop Epic targeted a large remaining orphan cluster. The
  series records a deliberate modeling discipline, not autonomous convergence.
- **Not all orphans are debt.** An unmodeled exercised symbol may be a genuinely missing model, a
  missing anchor on an existing model, or implementation detail below the grain the model should
  represent. Backward traceability from exercised symbols toward expected model edges distinguished these
  cases; only the first two necessarily call for additional modeling.

<!-- FUTURE: Recover and publish all nine measurements, including denominator or relevant traceability counts if available. The present endpoint-only series supports the endpoint claim but is not yet the raw series the ledger ideally promises. -->

## G.5 Representation and Navigation Cost {#nav-pilot}

A small exploratory pilot tested whether a model-derived navigation surface reduced the context an agent
consumed while determining where to look in the repository.

Across four tasks, model-guided navigation reduced reconstruction-token cost by a median of roughly 35%
relative to the from-scratch condition. No task-level correctness loss was recorded under the pilot's
existing evaluation.

| Measure | Baseline | Model-guided | Interpretation |
|---|---|---|---|
| Tasks | 4 | 4 | N too small for generalization |
| Reconstruction-token cost | Full baseline | ~35% lower median | Directional evidence of reduced reconstruction effort |
| Recorded correctness | Reference condition | No observed loss | The existing pilot does not support a general equivalence claim |

The tasks were not independently sampled, and N=4 is too small to estimate a general effect. Read the
result as a directional within-case observation consistent with the proposed mechanism: an explicit
representation may reduce the lower-level reconstruction an agent performs before it can act.

<!-- FUTURE: Supersede this subsection with the larger paired experiment already specified for the orchestrator — do not supplement it with another subsection. When those results exist, report task-level paired observations, tokens, tool/navigation calls, files opened, wall-clock time, and independently judged task success. -->

## G.6 Cost Receipts {#cost-receipt}

The following values support the order-of-magnitude cost discussion in Part V. They are not matched
economic comparisons and should not be read as audited accounting.

| Quantity | Observed or estimated value | Basis |
|---|---|---|
| Accessibility-checker findings in a representative deck | 42 | One graduate instructional deck evaluated with the built-in accessibility checker |
| Manual remediation, one teaching load | ≈ $20,000 faculty time | Findings/deck × minutes/finding × decks/course × loaded hourly rate |
| Vendor remediation | $3–$40 / page | Market range collected during the study; not staffed for graduate-level subject annotation |
| Automated processing, one representative deck | ≈ 1 minute; ≈ $1 direct processing cost | Warm-start service near the end of the study period |
| Direct development cost | ≈ $60,000 | Roughly 20-week study; majority salary |

The manual-remediation estimate and the automated-processing observation describe different units and
cost categories. One estimates faculty labor across a teaching load; the other records direct processing
cost for one representative deck. They indicate scale but are not a controlled cost comparison.

The vendor range is a market observation, not a quality-adjusted comparison with DocAble. The
development-cost figure is an order-of-magnitude direct-cost estimate, not audited project accounting.

<!-- FUTURE: Expand the ≈$20,000 estimate into its actual arithmetic once the underlying values are recovered. Attach provenance to the $3–$40/page vendor range. Break the ≈$60,000 direct-development estimate into salary, model/API, cloud, and other direct costs if those records are available. Add paired institutional-checker outcomes if available, and keep the resulting claim narrow — checker improvement is evidence about checker-detectable accessibility properties, not the complete experience of a disabled user. -->

## G.7 Measurement Without Authority {#measurement-seed}

These final receipts turn on a distinction Part V draws: a measurement can be useful before it deserves
authority.

### G.7.1 Provisional cost-and-time model

A per-chunk worst-case cost-and-time estimate was externalized as a timestamped provisional model, not
embedded as a permanent code constant.

Current instrumentation can report when an operation would exceed the provisional budget. Production
admission does not depend on that estimate, because the observation base is not yet strong enough to
justify a blocking threshold.

The evidentiary point is not that the provisional bound is correct. It is that the system keeps the
stages apart: **observation → representation → reporting**, then a deliberate break — the evidence is
insufficient, so nothing crosses into **authority**. A measured value can enter the engineering
environment without immediately becoming a gate.

<!-- FUTURE: If the exact seed observations become stable enough to publish, add them here. Otherwise retain this subsection as a provenance note, and do not imply quantitative calibration the ledger does not contain. -->

### G.7.2 Cold-start contrast case

The contrasting case did mature into an engineering decision.

The measured request-level cold-start value was 4,057 ms. That observation fed a topology model
representing the longest cold-start path and motivated an architectural change. The resulting warm floor
was 109 ms. The sequence is **request-level measurement (4,057 ms) → cold-start topology model →
architectural change → 109 ms warm floor**.

The point of the contrast is not that every measured quantity should eventually become a gate. It is
that authority follows evidentiary maturity. The provisional cost model stayed report-only; the
deterministic cold-start observation was stable and structurally interpretable enough to justify
architectural action.

<!-- FUTURE: If retained as a quantitative receipt, document the measurement conditions for 4,057 ms and 109 ms — deployment state, hardware/service conditions, number of observations if available, and whether the reported values are single observations, maxima, medians, or another statistic. -->

## G.8 What This Ledger Does Not Measure {#does-not-measure}

Most quantities in this appendix are activity, structural, or within-case mechanism measures:

- commits and line motion;
- source distribution;
- control counts;
- model coverage;
- correspondence catches and reopens;
- exploratory navigation cost;
- selected financial and runtime observations.

They are not direct estimates of the broader outcomes needed to compare MAGE against another engineering
process: durable throughput, defect escape, human-attention burden, or total cost of ownership.

The originating case did not collect those outcomes consistently enough, under a controlled
counterfactual, to estimate causal effects retrospectively. Part V therefore uses the measurements here
to establish what happened inside the case and which mechanisms were exercised — not what another
organization should expect from adopting MAGE.

The case itself is correspondingly bounded. It follows one production system, one primary engineer
directing an agent fleet, and one contemporary model ecosystem, without a controlled comparison against
another engineering process. It cannot establish that another organization will meet the same failures,
build the same mechanisms, or obtain the same economics. Part V states that limitation explicitly.

What the ledger provides is narrower and more useful: traceable evidence that the reported pressures
occurred, that particular engineering responses followed, that selected mechanisms were exercised under
continuing change, and that the book's quantitative descriptions can be inspected independently of the
narrative built around them.
