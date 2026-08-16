Measurement models represent quantitative properties of the running system and the bounds against
which those properties are evaluated. In review, they expose which measurement obligation changed
and what evidence supports the declared bound.

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

The authority field records whether a bound is descriptive, report-only, warning-producing, or
admission-blocking. Measurability alone does not justify enforcement.

[ref:fig-g5-measurement-authority] separates the measurement from the authority that may or may not
attach to it.

<!-- label: fig-g5-measurement-authority -->
<!-- figure: assets/appendix-g-5-measurement-authority.svg | *Measurement does not imply authority.* A sensor produces an observed measurement, which is compared with a declared bound. The result remains report-only unless the evidence justifies warning or admission authority. -->

**Property.** A measurement model can state that request latency remains below a declared bound for
a defined request class, queue depth below a declared ceiling, or processing cost within a specified
envelope. Scope, statistic, and aggregation window are part of the property; a threshold without them
is underspecified.

**Authority and correspondence.** Sensors supply observations; the model supplies their scope,
interpretation, and declared bounds. Measurements should remain descriptive until the evidence
justifies stronger authority.
