The raw evidence behind Part V's three measured curves, one table per curve. Each is sourced and
window-bounded; the running text cites the curve, the ledger holds the counts.

## The velocity curve {#velocity}

Commit volume across the build. It rose steeply as the fleet gained capability, held far above any
rate one reviewer could follow one diff at a time — on the order of 1,000 a week at the
sustained peak — then dipped through the hardening interval as the work record shifted toward models,
validation, and control machinery before feature work accelerated again. [ref:velocity-curve] plots
the weekly series; the dip is a change of character (producing the machinery that lets features be
produced safely), not a slowdown, and it is an interpretation of the commit classification, not a
measurement the bar heights make on their own.

<!-- label: velocity-curve -->
<!-- figure: assets/velocity-commits-per-week.svg | *The Velocity Curve.* Commits per week across the project's history — each bar one week. The curve rises as the fleet gains capability, then dips during the hardening interval, when the work record shifts toward mechanisms and validation. Read against the commit classification, the dip is the operator's shift from coder to architect, not a loss of pace. -->

## Support-ratio lines of code {#support-ratio}

Production and support-apparatus lines at each of the four dated commits — the counts behind the
support-ratio curve (*The Build*, "The support ratio: build the environment first"). Source: the
fail-loud census over the seven primary source roots.

| Window | Production LoC | Support LoC | Support ratio |
|---|---:|---:|---:|
| prototype — Apr 9 | 26,956 | 22,908 | 0.85× |
| mechanization — May 31 | 302,844 | 751,050 | 2.48× |
| hardening — Jun 30 | 337,905 | 1,244,194 | 3.68× |
| now — Aug 3 | 491,090 | 1,501,907 | 3.06× |

The apparatus starts below parity (0.85×), crosses production at mechanization (2.48×), peaks at
hardening (3.68×), then eases to 3.06× as feature work resumes on the finished environment — larger
than production across every mature window.

## Per-path churn {#churn}

Lines added and deleted per window on the two product paths (`web/`, the Python service and worker;
`backend/`, the C# tool and rule engine) — the counts behind the churn silhouette (*The Build*, "The
shape of the churn"). Source: `git numstat` over the commit-date windows. Read as a churn signal, not a
hand-authored source count (generated bundles and vendored trees ride along; the inflation is bounded
and time-localized — see the chapter's accounting footnote).

| Window | web/ added | web/ deleted | backend/ added | backend/ deleted |
|---|---:|---:|---:|---:|
| prototype | 22,539 | 7,717 | 48,636 | 10,166 |
| mechanization | 371,855 | 161,044 | 941,120 | 286,378 |
| hardening | 179,649 | 33,983 | 109,188 | 3,767 |
| loop-mgmt | 96,825 | 14,332 | 116,313 | 9,708 |

Mechanization is the add-and-delete peak, where `backend/` rewrote itself; after it the deletions
collapse and the later windows go net-additive as the environment stabilizes the code.
[ref:churn-per-path] draws the same silhouette.

<!-- label: churn-per-path -->
<!-- figure: assets/churn-per-path.svg | *Repository Motion Per Path.* Lines added above the baseline and deleted below it, one bar per path per window. Mechanization is the add-and-delete peak, where `backend/` rewrote itself; afterward the deletions collapse and later windows go net-additive. Line motion is a restructuring proxy, not the book's theoretical churn. -->

## Control growth {#control-growth}

The running count of project-specific lint files and gate scripts across the four windows — the counts
behind the control-growth curve (*The Build*, "The controls accumulate"). The full four-window series
is carried here in full, not compressed to endpoints. Source: a tree scan (`git ls-tree` per window
SHA) counting lint files under the lint directory and gate scripts, at the four study-window commit-date
boundaries.

| Window | Lint files | Gate scripts |
|---|---:|---:|
| prototype | 0 | 0 |
| mechanization | 336 | 20 |
| hardening | 595 | 76 |
| now | 747 | 102 |

Both surfaces start at literal zero: the substrate is post-prototype. At the final window the lint files
carry 993 registered lint specs, each a policy the environment enforces on every agent. The
failure-attribution discipline's footprint: 208 commits carry a paired fix-and-lint tag, and 27 lints
name a specific dated incident in their own text (spot-checked as genuine conversions). The counts
record a documented, growing discipline, not a measured causal rate — the fraction of controls born
from a failure versus authored up front is not separable from the tree scan alone.

## The derived floor under load {#model-sync-evidence}

The counts behind 5.3's field note on the map that pointed at a ghost, and behind the two-layer net
the models chapter names as concept ("How a model stays trustworthy"). Documentation drift is excluded
here by construction: this table is model↔code sync only — the doc-hygiene aside below is a distinct,
separately-counted class.

| Question | Evidence | Interpretation |
|---|---|---|
| Did real model↔code drift exist *before* the derived floor? | Around 27 genuine model↔code drifts at a signal-to-noise ratio near 1.0, found by re-running each closed Epic's own lints — including a prod-blocking pointer-drift incident and a fully-typed function shipped to zero consumers.¹ | Yes. The drift was real and had been escaping *silently* past a green definition of done. This is the class the floor was built to close. |
| Did the derived floor catch *fresh* drift at HEAD? | Six genuine catches in the refresh window: three traceability-broken (an unregistered model consumer, a missing component entry, a service-call-graph mismatch) and three stale-anchor or stale-test.² | Yes. Caught by the floor re-run at HEAD, not by a person reading — the hard layer firing on live code. |
| Did any drift reach a *post-close reopen*? | Zero, across a cumulative 56 Epic closes. | Nothing modeled-and-mechanically-decidable slipped past a close to a reopen. |
| Under what *change load* did the floor hold? | +8,970 / −173 lines across 63 commits to the models-bridge (query/reactor, governance-graph, and frontend-build models), a one-week window. | Heavy models-bridge churn is the load the net held under — the zero-reopen row is a result *under* this load, not one measured at rest. |

*Notes.* ¹ A pre-floor retro-audit re-ran each Epic's own lints against its own closed state; the
drifts it surfaced showed no false positives in manual review, classified by hand rather than against
an independently stated criterion. ² Caught by the derived floor re-run at HEAD: a symbol-anchored
drift lint, a consumer-registry-freshness check, and a service-call-graph drift lint.

Read together, the four rows answer a narrow question soberly: the drift the floor was built to close
was real and had been escaping unnoticed, the floor catches its kind fresh at HEAD, and nothing
modeled-and-decidable has yet slipped past a close to a reopen — under real churn, not at rest.

## Documentation-hygiene aside — not model sync {#doc-hygiene-aside}

Stale headers and stale prose numbers are **documentation drift, not model drift.** They are the soft
reading layer's true positives, not the derived floor's — and they are cheap: a reader (person or
strong model) catches them, and the close tooling heals them. Kept here, clearly separated, so they are
never folded into the model-sync count above.

| Doc-hygiene drift | Refresh-window count | Caught by | Healed by |
|---|---:|---|---|
| A status header frozen at a pre-close phase | 11 | reading (a person, or a strong model) | the close tooling rewrites the status atomically |
| A stale prose number (a count or percentage the code has since moved past) | 9 | a strong model re-deriving the number from code | a routed one-line fix or audit finding |

These rows describe prose no derived check parses. They are real, and the reading layer is the only
practical control for them — but they say nothing about whether the model still equals the code; that
claim rests on the table above, not this one.

## Reading the model-sync claim honestly {#model-sync-honest-reading}

The two tables above are receipts, not a proof, and they bound a narrower claim than their raw counts
might suggest:

- **Small N, stated plainly.** Per window, the count of genuine model↔code drifts is small — a handful,
  not a headline. The claim rests on that small set of genuine drifts the derived floor caught, plus
  zero model-drift reopens under heavy churn — not on any single catch-rate, which would mix doc-legible
  catches with modeled ones and rest on a denominator too small for the model-sync slice alone. This is
  a field report, not a proof.
- **The catch rate rose by composition, not by loosening.** A later refresh window caught more drift
  than an earlier one (17 of 20 closes, against the original 6 of 36) because it covered more territory
  — product-heavy Epics carrying more doc surface, exactly where the reading layer is the only practical
  control. The net did not weaken; there was more for it to catch.
- **The claim is about sync, not hygiene.** Three legs hold it up: the drift was real and had been used
  to escape (the ~27 pre-floor findings); the mechanism is derived reconciliation, not
  snapshot-and-sync, so it stays fresh by re-deriving rather than by being kept up to date by hand; and
  it held under load (the churn row, zero model-drift reopens). The doc-hygiene aside is kept separate
  on purpose — it would inflate this claim if folded in.
- **The boundary is the honest shape of the result.** Sync is enforced for the modeled and
  mechanically-decidable; it is aimed at, not enforced, for the semantic miss; and it is absent for the
  unmodeled until a metric or a self-governance reflex extends the net's coverage. Those are the two
  failure modes 2.3 names for the same net this table measures — a bound on the claim, not a footnote
  to it.

## The missing-model-metric drain {#missing-model-drain}

The traceability tracer counts the fraction of tests whose exercised code traces back to no model
claim — the *unmodeled surface*. Run repeatedly as the model-loop Epics closed, that fraction drained
from a majority of the exercised surface to under a tenth: **56% at the first run to 7.89% at the
ninth**. The series is the drain curve behind the Missing-Model Metric (*Operating MAGE*), re-homed
here as its raw Part-V receipt after the figure and table moved out of the operating chapter.

| Re-run | Unmodeled surface | Note |
|---|---:|---|
| first | 56% | majority of exercised code traced to no model claim — the starting orphan surface |
| middle runs | draining | each model-loop Epic aimed the next at the biggest remaining orphan cluster |
| ninth | 7.89% | under the 10%-or-under target; the remaining orphan surface is small and named |

Three cautions bound the number. It measures *coverage of the modeled surface*, not model quality: a
test can trace to a model claim that is itself thin. The drain is driven by an operator steering each
Epic at the largest orphan cluster, so it records a documented discipline, not an autonomous
convergence. And a residual near 8% is expected, not a defect: some exercised code is genuinely below
the grain any model should carry.

The tracer also exposed a *granularity gap*. When a test traced to no model claim, three candidate
explanations had to be discriminated: a genuinely **missing model**, a **missing anchor** on an
existing model, or code simply **below the grain** a model should represent. A backward-traceability
graph — from exercised symbol back toward the model edges that should cover it — is what let the
operator tell the three apart rather than treating every orphan as a modeling gap. Only the first two
are debt the drain should retire; the third is a boundary the metric learns to stop counting.

## The navigation pilot {#nav-pilot}

A small pilot measured whether a model-derived navigation surface reduced the tokens an agent spent
reconstructing where to look. Across **four tasks**, model-guided navigation cut token cost by a
**median of roughly 35%** against a from-scratch baseline **at no measured accuracy loss**. The N is
tiny and the tasks were not independently sampled, so this is a directional field observation, not a
measured law — but it is consistent with the mechanism the models were built to serve: a representation
lets an agent find what it needs instead of re-deriving it, keeping the task inside its context window.

| Measure | Baseline | Model-guided | Reading |
|---|---|---|---|
| Tasks (N) | 4 | 4 | too few for a law; directional only |
| Reconstruction token cost | full | ~35% lower (median) | model-derived navigation localizes the search |
| Accuracy | reference | no measured loss | the saving did not trade correctness |

## The development cost receipt {#cost-receipt}

The assumptions behind the cost figures the chapters quote (5.1's per-course footnote and 5.2's receipt
box). Each rests on a small, stated model rather than a headline number.

| Figure | Value | Assumptions |
|---|---|---|
| Findings per representative deck | 42 | one graduate instructional deck run through the built-in accessibility checker |
| Hand-remediation, one teaching load | ~$20,000 of faculty time | findings per deck × minutes per finding × decks per course × a loaded hourly rate |
| Vendor quote | $3 to $40 a page | market range; not staffed for graduate-level subject annotation |
| Automated processing, one deck | about a minute · about a dollar | warm-start service, end of the study period |
| Direct development cost | about sixty thousand dollars | most of it salary, across the ~20-week study |

The figures are order-of-magnitude receipts for the bind the chapter describes, not audited accounting:
each depends on assumptions (minutes per finding, decks per course, the hourly rate) that a different
institution would set differently.

## The measurement-model seed {#measurement-seed}

The provisional per-chunk worst-case cost-and-time model from 5.4.8 — the measurement that stops before
the gate. It is kept as an externalized, timestamped, explicitly provisional seed datapoint in a file
rather than frozen as a constant in code, so one incident does not quietly become an eternal constant.
Current instrumentation can report a would-be budget breach; no production admission depends on it,
because the bound is not calibrated strongly enough to deserve that authority. The contrast case in the
same section — the deterministic cold-start number (4,057 ms at the request level, fed into a
longest-cold-start-path topology model, driving a re-architecture to a 109 ms warm floor) — is the seed
that *did* earn authority, and it is recorded in the running text there, not as a table here. The
open-authority node is part of the evidence: representation and observation can mature before a gate is
justified.
