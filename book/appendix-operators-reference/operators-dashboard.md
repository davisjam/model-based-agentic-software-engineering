The dashboard asks whether autonomous work is producing durable, trustworthy progress. Read the outcomes first; use diagnostics to explain why they changed.

Track five primary readings: durable throughput, defect escape, human-attention burden, representation health, and engineering-capital return. The first three measure outcomes; the last two ask whether the environment can sustain them. Churn, model coverage, support ratio, control count, grammar coverage, and navigation cost are diagnostics, not objectives.

<!-- label: operators-dashboard -->
<!-- table: The Operator's Dashboard. Five primary readings, the question each answers, the desired direction of change, and useful diagnostics. [short: The Operator's Dashboard — five primary readings] -->
| Reading | What to ask | Healthy direction | Useful diagnostics |
|---|---|---|---|
| **Durable throughput** | How much accepted work survives without reopening, rollback, or repeated repair? | More accepted capability without proportional growth in intervention | closure rate; reopen rate; change cadence; churn |
| **Defect escape** | What incorrect or policy-violating work crosses the boundary that was supposed to catch it? | Falls for governed obligations | validator findings; escaped defects; rollback/incident rate |
| **Human-attention burden** | How much repeated reconstruction, review, or adjudication does each unit of durable work require? | Falls where knowledge or judgment can be made durable; remains where human judgment is deliberate | interventions per landed change; review time; recurring decisions |
| **Representation health** | Can the representations being relied upon still answer the questions they claim to answer? | Claimed correspondence holds; stale or uncovered surfaces remain explicit | drift checks; traceability; freshness; coverage/relevance |
| **Engineering-capital return** | Does accumulated structure make later work more capable or cheaper than the structure costs to carry? | Reuse and inherited capability rise while carrying cost remains justified | mechanism reuse; recurring-class disappearance; maintenance burden; retirement candidates |

DocAble's support ratio, control count, Missing-Model drain, navigation pilot, and churn curves are observations from one build, not operating targets. Appendix H records the underlying measurements and their limitations.

Treat uncalibrated visual indicators as status, not quantitative measurements.
