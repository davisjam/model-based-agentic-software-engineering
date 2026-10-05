# sysml/quantity-unit-magnitude-001

**MAGE construct** — a quantity: a declared magnitude carrying a dimension and a unit
(`quantities`, the `quantitative-model` substrate; normalization in `DIMENSIONS`,
`src/ir/types.ts`).

**Registry row** — `MODEL_TYPES` `quantitative-model`, `semanticBasis.kind: "borrowed"`,
`standard: "SysML v2"` (`src/engine/model-types.ts`, the `quantitative-model` entry).

**Standard concept** — a quantity value from the Quantities and Units Domain Library: a number
paired with exactly one measurement reference of the value's own dimension.

## The specification, quoted

The decisive material is **declared structure and declared values** in OMG's normative
machine-readable Quantities and Units Domain Library
(`https://www.omg.org/spec/SysML/20250201/Quantities-and-Units-Domain-Library.kpar`, whose
`.meta.json` declares `metamodel: https://www.omg.org/spec/SysML/20250201`). Four excerpts, no prose
between them and the claim:

`ISQBase.sysml` — a duration value is a pair, and the unit arm has multiplicity exactly 1:

```
attribute def DurationValue :> ScalarQuantityValue {
    attribute :>> num: Real;
    attribute :>> mRef: DurationUnit[1];
}

attribute def DurationUnit :> SimpleUnit {
    private attribute durationPF: QuantityPowerFactor[1] { :>> quantity = isq.T; :>> exponent = 1; }
    attribute :>> quantityDimension { :>> quantityPowerFactors = durationPF; }
}
```

`SI.sysml` — the reference unit: `attribute <s> second : DurationUnit;`

`SIPrefixes.sysml` — the conversion factor, as a declared value:
`attribute milli: UnitPrefix { :>> longName = "milli"; :>> symbol = "m"; :>> conversionFactor = 1E-3; }`

`MeasurementReferences.sysml` — how a prefixed unit gets that factor:
`attribute def ConversionByPrefix :> UnitConversion { attribute prefix: UnitPrefix[1]; attribute conversionFactor redefines UnitConversion::conversionFactor = prefix.conversionFactor; }`

The clause reference for the same material is SysML v2.0 (OMG Document Number
**formal/2026-03-02**, March 2026) **9.8 Quantities and Units Domain Library**, and the ISQ base
quantities at **9.8.3**. `source.sysml` Part A quotes every excerpt with its file and line.

## The ONE interpretation this fixture pins

> **A magnitude is a number paired with exactly one unit of its dimension, so a ceiling comparison
> is decided by the magnitudes and not by the unit tokens the author wrote.**

Operationally, in `model.mage.yaml`: two stages charge `300 ms` each along the run that reaches
`finished`; the budget is declared as `1 s`. The numbers are chosen so the two readings disagree.

| reading | arithmetic | verdict |
|---|---|---|
| as magnitudes | 300 ms + 300 ms = 600 ms, and 600 ms ≤ 1 s | `holds` |
| as bare numbers | 300 + 300 = 600, and 600 ≤ 1 | `refuted` |

So `expect: holds` on `run-stays-within-its-budget` is the discriminating pin, and the engine reports
`magnitude: { value: 600, dimension: "duration", unit: "ms" }` beside it — the normalized total, in
base units, which is the figure the comparison used. `run-finishes` is the positive control: without
it the ceiling query could be deciding over an empty set of executions.

**What would be false if the construct meant something else.** Read the unit as a decorative label
and the comparison is 600 against 1, which answers `refuted`. The conformance test pins that
explicitly by rewriting the budget to `1 ms` — the number a label-blind reading would compare 600
against — and asserting the verdict does flip.

The test then pins both directions of the magnitude claim:

- **Magnitude-preserving rewrites must not change the verdict.** Budget `1 s` → `1000 ms`, and both
  charges `300 ms` → `0.3 s`, each leave the verdict `holds` and the reported magnitude at 600 ms.
- **Magnitude-changing rewrites must change it.** Budget → `500 ms` and → `0.5 s` both flip to
  `refuted`, and the two spellings of one magnitude agree with each other.
- **A foreign unit is refused, not coerced.** A `duration` quantity written `300 MB` produces the
  V30 finding "value '300 MB' is measured in memory, but this quantity declares duration" and the
  query comes back `unlicensed`. That is the MAGE realization of `mRef: DurationUnit[1]`: a unit
  outside the dimension cannot be the measurement reference, so there is no magnitude to compute
  with.

## What this fixture does NOT establish

- **MAGE's base unit is not SI's.** `DIMENSIONS.duration` declares `base: "ms"` with
  `units: { ms: 1, s: 1000 }` (`src/ir/types.ts`), while the library makes `s` the reference unit.
  The correspondence claimed is the **conversion ratio** and the dimensional partition, both
  base-independent. The choice of base is the Workbench's and is attributed to nobody.
- **The library declares no `millisecond`.** It declares the `milli` prefix's factor of `1E-3`, the
  `ConversionByPrefix` mechanism, `s` as the `DurationUnit`, and — for length — `millimetre`
  assembled from exactly those parts. `source.sysml` Part B assembles a millisecond by copying the
  `millimetre` declaration and substituting `s` for `m`. That substitution is this project's. It is
  a one-step instantiation of a declared mechanism rather than a reading of prose, which is why
  `oracle.json` records `normative-artifact` and names this as the bound.
- **Only `duration` is exercised.** MAGE's `memory`, `cost`, `ratio` and `count` dimensions are not
  checked here, and `ratio` and `count` have `base: null` — no unit at all — so they are not
  realizations of this concept and no fixture should imply they are.
- **Quantity dimensions are not composed.** The library builds derived units by arithmetic over
  base units (`B/s`, `kg*m*s^-2`). MAGE's `DIMENSIONS` is a closed table of five with no
  composition, so the vast majority of the library has no MAGE counterpart.
- **Aggregation is the Workbench's, not the standard's.** Summing charges along an execution into a
  latency total is MAGE analysis semantics; the `QueryPrimitive.semanticBasis` for `latency`,
  `cost` and `peak_memory` says `kind: "extension"` for exactly that reason. This fixture pins the
  magnitude arithmetic the comparison performs, not the decision to sum.
- **It says nothing about the next construct, and nothing about completeness** (section 35.6).
