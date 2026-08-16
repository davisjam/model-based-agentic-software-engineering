The dashboard asks whether autonomous activity is producing durable, trustworthy progress. Read outcomes first, then use diagnostic measures to explain changes in those outcomes. The relevant outcomes are accepted work, defect escape, human-attention burden, and the continuing return from the engineering structure that supports them.

The five primary readings are durable throughput, defect escape, human-attention burden, representation health, and engineering-capital return. The first three are outcome measures; the last two indicate whether the environment can sustain them. Churn, model coverage, support ratio, control count, grammar coverage, and navigation cost are diagnostics, not objectives.

<!-- label: operators-dashboard -->
<!-- table: The Operator's Dashboard. Five primary readings, the question each answers, the desired direction of change, and useful diagnostics. [short: The Operator's Dashboard — five primary readings] -->
| Reading | What to ask | Healthy direction | Useful diagnostics |
|---|---|---|---|
| **Durable throughput** | How much accepted work survives without reopening, rollback, or repeated repair? | More accepted capability without proportional growth in intervention | closure rate; reopen rate; change cadence; churn |
| **Defect escape** | What incorrect or policy-violating work crosses the boundary that was supposed to catch it? | Falls for governed obligations | validator findings; escaped defects; rollback/incident rate |
| **Human-attention burden** | How much repeated reconstruction, review, or adjudication does each unit of durable work require? | Falls where judgment has become externalizable; remains where semantic judgment is deliberately human | interventions per landed change; review time; recurring decisions |
| **Representation health** | Can the representations being relied upon still answer the questions they claim to answer? | Claimed correspondence holds; stale or uncovered surfaces remain explicit | drift checks; traceability; freshness; coverage/relevance |
| **Engineering-capital return** | Is accumulated structure making later work more capable or cheaper to reason about than it costs to carry? | Reuse and inherited capability rise while carrying cost remains justified | mechanism reuse; recurring-class disappearance; maintenance burden; retirement candidates |

DocAble's support ratio, control count, Missing-Model drain, navigation pilot, and churn curves are observations from one build, not operating targets. Appendix G records the underlying measurements and their limitations.

Treat uncalibrated visual indicators as status, not quantitative measurements.
