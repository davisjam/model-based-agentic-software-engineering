Behavioral models state which executions are legal. Measurement models state which quantitative
envelope the running system claims to inhabit. In review, they answer *which measurement obligation
changed, and what evidence says the resulting system stays acceptable?*

**Engineering question.** What quantity matters, how is it measured, what bound has been declared,
and what should happen when the bound is exceeded?

**Representation.**

```
Measure
    id
    quantity
    unit
    scope
    observation_source
Bound
    measure_id
    threshold
    aggregation
    authority
```

The last field carries the point. A bound may be descriptive, report-only, warning-producing, or
admission-blocking. A number does not earn authority merely by being measurable.

[ref:fig-g5-measurement-authority] separates the measurement from the authority that may or may not
attach to it.

<!-- label: fig-g5-measurement-authority -->
<!-- figure: assets/appendix-g-5-measurement-authority.svg | *Measurement does not imply authority.* A sensor observes the running system (dashed) and produces a measurement — latency, cost, queue depth. The model compares it against a declared bound. The branch is on evidence, not on the number: where the evidence is insufficient the result stays report-only; where it is sufficient the bound may act as a warning or an admission gate. Only the gate leg carries real authority. -->

**Property.** A measurement model makes statements such as: request latency stays below a declared
bound for a defined request class; queue depth stays below a declared ceiling; direct processing
cost stays inside a specified envelope.

The scope and aggregation are part of the property, not decoration. *Latency below 500 ms* says
nothing useful until it names the request class, the statistic, and the window it holds over.

**Authority and correspondence.** Sensors supply the observations. The model supplies the declared
interpretation and, where justified, the bound. Part V shows both outcomes: measurements that stayed
provisional, and measurements stable enough to justify an architectural change. The rule that keeps
the two honest: represent first, and grant authority only when the evidence warrants it.
