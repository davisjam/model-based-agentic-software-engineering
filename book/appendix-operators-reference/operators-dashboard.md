The dashboard collects the primary metrics used to operate a Governed Engineering Environment. Formative
metrics steer work while it is in progress. Summative metrics certify the finished system. Some metrics
serve both purposes.

[ref:operators-dashboard] gives each metric in two bands — the formative metrics above the divider, the
summative verdicts below — with what each one counts, when to read it, and its healthy direction. Scan the
band you need. The [3.5](3.5-metrics.html) reference is the companion one level down: read it to steer a
single loop iteration, read this to steer or grade the whole program.

<!-- label: operators-dashboard -->
<!-- table: The Operator's Dashboard — every metric the build acts on, in two mode bands: the formative metrics you steer by while the work is in flight, then the summative verdicts you certify the result with at maturity. [short: The Operator's Dashboard — formative and summative metrics] -->
| Metric | Mode | What it counts | When to watch | Healthy direction | Defined in |
|---|---|---|---|---|---|
| **Formative — measured during the work, to steer the next step** | | | | | |
| **Missing-Model Metric** | formative | Fraction of tests whose exercised code traces to no model claim — the unmodelled surface — plus its drain curve. | After each model-loop Epic; steer the next at the biggest orphan cluster. | Drains toward 10%-or-under (56% to 7.89% over nine re-runs). | [3.5](3.5-metrics.html#mmm-drain) |
| **Velocity** | formative | Commits per week. | Watch the dip where velocity buys hardening. | Roughly linear; a hardening dip is expected, not alarming. | [5.2](5.2-the-timeline-and-the-work.html#velocity) |
| **Churn** | formative | Lines added and deleted per week per path. | Reads which build phase you are in. | Peaks at mechanization, then collapses as the environment stabilizes. | [5.2](5.2-the-timeline-and-the-work.html#churn) |
| **Model-sync efficacy** | formative | Whether the drift and parity gates keep model equal to code. | Watch that map-equals-territory holds. | Gates stay green. | [2.12](2.12-keeping-models-in-sync.html) |
| **Grammar coverage** | formative | Whether the generator exercised every production of the input grammar. | Watch for corpus holes no line-coverage number reveals. | Rises toward full grammar exercise. | [4.6](4.6-generative-validation.html) |
| **Model-claim coverage** | formative | Whether generated inputs drove every declared invariant, transition, and edge. | The saturation oracle for generative validation. | Rises toward full claim exercise. | [4.6](4.6-generative-validation.html) |
| **Summative — measured at maturity, a verdict on the result** | | | | | |
| **MBSE navigation token-savings** | summative | Tokens spent to reach an answer, model on versus off. | Certify the model earned its context budget. | Lower with the model on. | [2.3](2.3-the-executable-zoo.html) |
| **Support ratio** | both | Support-apparatus LoC (tests, lints, docs, infra, tooling) over production LoC. | Watch the apparatus keeps leading as feature work resumes. | Leads production; settles around 3x it at maturity. | [5.2](5.2-the-timeline-and-the-work.html#support-ratio-curve) |
| **Control growth** | both | Project-specific lint files and gate scripts, per window. | Watch the environment still accrete controls. | Climbs steadily (lints 0 to 747; gates 0 to 102). | [3.3](3.3-the-governed-environment.html#control-growth) |
| **Epic-closure rate** | both | Epics moved into the closed set per week — the finishing rate, not the commit rate. | Whether an operating-mode shift converts to durable throughput rather than raw output. | Rises when the environment absorbs autonomous loops; flat velocity beside a rising closure rate is the healthy anti-decay shape. | [5.2](5.2-the-timeline-and-the-work.html) |

Each metric's mode and the rationale for its formative-or-summative call live in the dashboard's model file,
which projects this table and holds the page equal to it.
