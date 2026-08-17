## G.2 Build Scale and Repository Motion

### G.2.1 Weekly Commit Volume {#velocity}

Weekly commit volume rose sharply as the agent fleet expanded, exceeded 1,000 commits per week during
sustained high-volume periods, and briefly exceeded 3,000. Volume declined through the interval Part V
identifies as hardening, then rose again.

Commit classification indicates that a larger share of work during the hardening interval concerned
models, validation, tests, and control machinery. The commit counts themselves do not establish why
volume changed, or whether engineering productivity rose or fell. [ref:velocity-curve] plots the weekly
series.

<!-- label: velocity-curve -->
<!-- figure: assets/velocity-commits-per-week.svg | *Weekly Commit Volume.* Commits per week across the project history. Bar height measures repository activity, not engineering productivity; interpreting the hardening interval requires classifying the work represented by those commits. -->

<!-- FUTURE: When available, add Epics-closed/week and reopens/week — either onto Figure H-1 or immediately after it. Commits measure activity; completed engineering units are a complementary measure closer to durable throughput. Insert the planned reviewer-capacity bound here once measured, and keep it a sensitivity analysis rather than an assertion about actual review speed. -->

### G.2.2 Support-Apparatus Ratio {#support-ratio}

Production and support-apparatus source were counted at four dated repository states using a census over
the seven primary source roots that fails if an expected root is absent. These counts are the source for
the support-ratio curve in Part V.

| Window | Production LoC | Support LoC | Support ratio |
|---|---:|---:|---:|
| Prototype — Apr. 9 | 26,956 | 22,908 | 0.85× |
| Mechanization — May 31 | 302,844 | 751,050 | 2.48× |
| Hardening — Jun. 30 | 337,905 | 1,244,194 | 3.68× |
| Final snapshot — Aug. 3 | 491,090 | 1,501,907 | 3.06× |

Support-apparatus source began below parity with production source, crossed it by the mechanization
snapshot, peaked at 3.68× during hardening, and stood at 3.06× at the final snapshot.

These counts describe how source was distributed in this repository. The ratio is not a measure of
engineering value, engineering-capital return, or a recommended target for another project.

### G.2.3 Product-Path Line Motion {#churn}

Lines added and deleted were counted over four windows for the two principal product paths:

- **`web/`** — the Python service and worker.
- **`backend/`** — the C# tool and rule engine.

Source: `git numstat` over the dated commit windows.

| Window | web/ added | web/ deleted | backend/ added | backend/ deleted |
|---|---:|---:|---:|---:|
| Prototype | 22,539 | 7,717 | 48,636 | 10,166 |
| Mechanization | 371,855 | 161,044 | 941,120 | 286,378 |
| Hardening | 179,649 | 33,983 | 109,188 | 3,767 |
| Loop management | 96,825 | 14,332 | 116,313 | 9,708 |

The mechanization window contains the largest add-and-delete volume, particularly in `backend/`.
Deletions fall sharply in the later windows, and both paths become strongly net-additive.
[ref:churn-per-path] plots these counts.

These counts are a repository-motion proxy, not the theoretical concept of churn used elsewhere in the
book. Generated bundles and vendored trees are included where they occur; Part V's accounting note
describes that bounded inflation.

<!-- label: churn-per-path -->
<!-- figure: assets/churn-per-path.svg | *Product-Path Line Motion.* Lines added above the baseline and deleted below it, by path and study window. Mechanization contains the largest observed line motion. The later reduction in deletions is consistent with less structural rewriting but does not establish its cause. -->

### G.2.4 Growth of Countable Controls {#control-growth}

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
- **Incident-named lints** — 27 lints name a specific dated incident in their text; spot checks
  confirmed that the sampled cases linked an observed failure to the resulting control.

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

### G.3.1–G.3.4 Correspondence Results {#model-sync-evidence}

| Claim | Measurement | Result | Limitation |
|---|---|---|---|
| Model↔code drift existed before the derived floor | Re-run each closed Epic's own lints against its closed state; classify findings by hand | Approximately 27 genuine model↔code drifts, including a production-blocking pointer drift and a fully typed function with zero consumers | Manual classification; no independently specified oracle |
| Derived checks catch fresh drift | Re-run the derived floor at HEAD | 6 genuine catches: three traceability failures and three stale-anchor or stale-test failures | Small N; measures only governed surfaces |
| Post-close recurrence of modeled, mechanically decidable drift | Census over 56 cumulative Epic closes | 0 observed across 56 cumulative Epic closes | Finite observation window; does not cover semantic or unmodeled drift |
| Checks were exercised during continuing model-bridge change | `git numstat` over one week for the query/reactor, governance-graph, and frontend-build models | +8,970 / −173 lines across 63 commits | Line motion is a change-load proxy, not a measure of semantic difficulty |

Manual review classified all approximately 27 pre-floor findings as genuine model↔code drift. Because
classification used human judgment rather than an independently specified criterion, this establishes a
pre-existing drift class, not detector precision.

The six HEAD catches were an unregistered model consumer, a missing component entry, a
service-call-graph mismatch, and three stale-anchor or stale-test cases. A symbol-anchored drift lint, a
consumer-registry-freshness check, and a service-call-graph drift lint detected them.

Taken together, these observations establish a bounded within-case sequence: model↔code drift existed
before the derived checks; the checks caught six fresh instances; and no post-close recurrence of the
modeled, mechanically decidable class was observed across 56 closes during the measured window. They do
not establish that the class was eliminated or that the mechanism prevents model drift.

### G.3.5 Documentation Drift — Excluded from the Model-Sync Claim {#doc-hygiene-aside}

Stale headers and stale prose numbers are documentation drift, not model↔code drift. They are counted
separately because folding them into the correspondence measurements would inflate the model-sync
evidence.

| Documentation drift | Refresh-window count | Detected by | Resolution |
|---|---:|---|---|
| Status header frozen at a pre-close phase | 11 | Reading by a person or capable model | Close tooling rewrites the status atomically |
| Stale prose number after the implementation moved past it | 9 | Model re-deriving the number from code | Routed one-line fix or audit finding |

These observations concern prose that no derived correspondence check parses. They therefore say nothing
about whether a model remains synchronized with implementation.

### G.3.6 Scope of the Model-Sync Claim {#model-sync-honest-reading}

The correspondence mechanisms cover only modeled, mechanically decidable relationships, and the observed
N is small. A semantic mismatch whose anchors still resolve may remain judgment-dependent, and an
unmodeled region has no model-correspondence check at all.

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
  decline reflects deliberate modeling work, not autonomous convergence.
- **Not all orphans are debt.** An unmodeled exercised symbol may be a genuinely missing model, a
  missing anchor on an existing model, or implementation detail below the grain the model should
  represent. Backward traceability from exercised symbols toward expected model edges distinguished these
  cases; only the first two necessarily call for additional modeling. The unmodeled fraction measures
  absence of explicit representation, not engineering deficiency: the remainder may include unknown
  obligations, tacit obligations, and deliberately preserved degrees of freedom. MAGE does not prescribe
  zero as the target.

<!-- FUTURE: Recover and publish all nine measurements, including denominator or relevant traceability counts if available. The present endpoint-only series supports the endpoint claim but is not yet the raw series the ledger ideally promises. -->

## G.5 Representation and Navigation Cost {#nav-pilot}

A small exploratory pilot tested whether a model-derived navigation surface reduced the context an agent
consumed while determining where to look in the repository.

Across four tasks, model-guided navigation reduced reconstruction-token cost by a median of roughly 35%
relative to the from-scratch condition. The existing evaluation recorded no task-level loss of
correctness.

| Measure | Baseline | Model-guided | Interpretation |
|---|---|---|---|
| Tasks | 4 | 4 | N too small for generalization |
| Reconstruction-token cost | Full baseline | ~35% lower median | Directional evidence of reduced reconstruction effort |
| Recorded correctness | Reference condition | No observed loss | The existing pilot does not support a general equivalence claim |

The tasks were not independently sampled, and N=4 is too small to estimate a general effect. The
result is a directional within-case observation consistent with the proposed mechanism: an explicit
representation may reduce the lower-level reconstruction an agent performs before acting.

<!-- FUTURE: Supersede this subsection with the larger paired experiment already specified for the orchestrator — do not supplement it with another subsection. When those results exist, report task-level paired observations, tokens, tool/navigation calls, files opened, wall-clock time, and independently judged task success. -->

## G.6 Cost and Scale Receipts {#cost-receipt}

These quantities establish orders of magnitude relevant to the Part V discussion. Their units, scopes,
and cost categories differ; they are not entries in a comparative cost model.

| Quantity | Observed or estimated value | Basis |
|---|---|---|
| Accessibility-checker findings in a representative deck | 42 | One graduate instructional deck evaluated with the built-in accessibility checker |
| Manual remediation, one teaching load | ≈ $20,000 estimated faculty labor | Findings/deck × minutes/finding × decks/course × loaded hourly rate |
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

A measurement can be useful before it deserves authority.

### G.7.1 Provisional Cost-and-Time Model

A per-chunk worst-case cost-and-time estimate was externalized as a timestamped provisional model, not
embedded as a permanent code constant.

Current instrumentation can report when an operation would exceed the provisional budget. Production
admission does not depend on that estimate, because the observation base is not yet strong enough to
justify a blocking threshold.

The provisional bound need not be correct to be useful. The system keeps the stages separate:
**observation → representation → reporting**. Because the evidence is insufficient, the estimate does not
cross into **authority**. A measured value can enter the engineering environment without immediately
becoming a gate.

<!-- FUTURE: If the exact seed observations become stable enough to publish, add them here. Otherwise retain this subsection as a provenance note, and do not imply quantitative calibration the ledger does not contain. -->

### G.7.2 Cold-Start Contrast Case

The contrasting case did mature into an engineering decision.

The measured request-level cold-start value was 4,057 ms. That observation fed a topology model
representing the longest cold-start path and motivated an architectural change. The resulting warm floor
was 109 ms. The sequence is **request-level measurement (4,057 ms) → cold-start topology model →
architectural change → 109 ms warm floor**.

The contrast does not imply that every measured quantity should eventually become a gate. Authority
requires evidence adequate to the decision being made. The provisional cost model remained report-only;
the stable, structurally interpretable cold-start observation justified architectural action.

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

These are not direct estimates of the broader outcomes needed to compare MAGE with another engineering
process: durable throughput, defect escape, human-attention burden, or total cost of ownership. The case
follows one production system, one primary engineer directing an agent fleet, and one contemporary model
ecosystem; it did not collect those outcomes under a controlled counterfactual. The measurements
therefore establish what happened within the case and which mechanisms were exercised, not the effects
another organization should expect from adopting MAGE.

The ledger provides a narrower result: traceable evidence that the reported pressures occurred, that
particular engineering responses followed, that selected mechanisms were exercised under continuing
change, and that the quantitative descriptions can be inspected independently of the narrative built
around them.
