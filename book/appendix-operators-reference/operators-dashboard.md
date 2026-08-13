The dashboard answers one question: is the engineering environment turning autonomous activity into durable, trustworthy progress? Read outcomes first, then use diagnostic measures to explain movement in those outcomes. A healthy environment is not the one with the most models, controls, tests, or support code. It is the one in which useful work lands, failures escape less often, human attention is spent where judgment adds value, and the machinery carrying that work continues to repay its cost.

The primary readings are durable throughput, defect escape, human-attention burden, representation health, and engineering-capital return. The first three describe what the environment produces; the last two help explain whether the environment itself can sustain that performance. Measures such as churn, model coverage, support ratio, control count, grammar coverage, and navigation cost are diagnostic instruments. Use them when they illuminate one of the primary readings; do not optimize them for their own sake.

[ref:operators-dashboard] sets each reading against the question it answers, its healthy direction, and the diagnostics that explain movement in it.

<!-- label: operators-dashboard -->
<!-- table: The Operator's Dashboard — the five primary readings the build steers and certifies by: for each, the question to ask, the healthy direction of travel, and the diagnostic measures that explain movement in it. [short: The Operator's Dashboard — five primary readings] -->
| Reading | What to ask | Healthy direction | Useful diagnostics |
|---|---|---|---|
| **Durable throughput** | How much accepted work survives without reopening, rollback, or repeated repair? | More accepted capability without proportional growth in intervention | closure rate; reopen rate; change cadence; churn |
| **Defect escape** | What incorrect or policy-violating work crosses the boundary that was supposed to catch it? | Falls for governed obligations | validator findings; escaped defects; rollback/incident rate |
| **Human-attention burden** | How much repeated reconstruction, review, or adjudication does each unit of durable work require? | Falls where judgment has become externalizable; remains where semantic judgment is deliberately human | interventions per landed change; review time; recurring decisions |
| **Representation health** | Can the representations being relied upon still answer the questions they claim to answer? | Claimed correspondence holds; stale or uncovered surfaces remain explicit | drift checks; traceability; freshness; coverage/relevance |
| **Engineering-capital return** | Is accumulated structure making later work more capable or cheaper to reason about than it costs to carry? | Reuse and inherited capability rise while carrying cost remains justified | mechanism reuse; recurring-class disappearance; maintenance burden; retirement candidates |

Diagnostic instruments are not goals. DocAble's support ratio, control count, Missing-Model drain, navigation pilot, and churn curves are evidence about one build. They can suggest measurements for another environment, but their values are not operating targets. Appendix H carries the raw DocAble receipts and their limitations.

A visual mark without a declared measure is status, not quantity. Never infer precision from its size.
