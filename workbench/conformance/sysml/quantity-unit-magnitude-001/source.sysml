// The STANDARD side of conformance fixture sysml/quantity-unit-magnitude-001.
//
// Two parts. PART A is VERBATIM from OMG's normative machine-readable Quantities and Units Domain
// Library, with the file and line on every excerpt. PART B is a minimal model this project
// COMPOSED in the standard's textual notation; it has NOT been parsed by any tool, because we take
// no runtime dependency on the SysML v2 Pilot Implementation
// (DESIGN-v02-semantics-261004.md section 35.1). The correspondence claim in claim.md rests
// entirely on Part A.
//
// Artifact: https://www.omg.org/spec/SysML/20250201/Quantities-and-Units-Domain-Library.kpar
// Its .meta.json declares: { "created": "2025-03-13T00:00:00Z",
//                            "metamodel": "https://www.omg.org/spec/SysML/20250201" }
//
// ============================================================================================
// PART A -- verbatim normative excerpts
// ============================================================================================
//
// A1. `ISQBase.sysml` lines 41-63. The DECISIVE excerpt: a duration magnitude is a pair, and the
//     unit arm has multiplicity exactly 1. Verbatim, with the doc comment abridged to the two
//     lines the claim uses:
//
//         /* ISO-80000-3 item 3-9 duration, time */
//         attribute def DurationValue :> ScalarQuantityValue {
//             doc
//             /*
//              * quantity dimension: T^1
//              * measurement unit(s): s
//              */
//             attribute :>> num: Real;
//             attribute :>> mRef: DurationUnit[1];
//         }
//
//         attribute def DurationUnit :> SimpleUnit {
//             private attribute durationPF: QuantityPowerFactor[1] {
//                 :>> quantity = isq.T; :>> exponent = 1; }
//             attribute :>> quantityDimension { :>> quantityPowerFactors = durationPF; }
//         }
//
//     Read structurally: `num: Real` and `mRef: DurationUnit[1]`. A duration value is not a bare
//     number; it carries exactly one measurement reference, and that reference must be a
//     DurationUnit, whose quantityDimension is fixed to T^1.
//
// A2. `SI.sysml` line 24 -- the reference unit:
//
//         attribute <s> second : DurationUnit;
//
// A3. `SIPrefixes.sysml` line 21 -- the conversion factor, as a declared VALUE:
//
//         attribute milli: UnitPrefix { :>> longName = "milli"; :>> symbol = "m";
//                                       :>> conversionFactor = 1E-3; }
//
// A4. `MeasurementReferences.sysml` lines 318-350 -- how a prefixed unit gets its factor:
//
//         abstract attribute def UnitConversion {
//             attribute referenceUnit: MeasurementUnit;
//             attribute conversionFactor: Real;
//             attribute isExact: Boolean default true;
//         }
//
//         attribute def ConversionByPrefix :> UnitConversion {
//             attribute prefix: UnitPrefix[1];
//             attribute conversionFactor redefines UnitConversion::conversionFactor
//                 = prefix.conversionFactor;
//         }
//
// A5. `SI.sysml` line 304 -- the pattern, exhibited verbatim by the library for LENGTH:
//
//         attribute <mm> millimetre : LengthUnit {
//             :>> unitConversion: ConversionByPrefix { :>> prefix = milli; :>> referenceUnit = m; } }
//
//     BOUND, stated because it is the one gap in this chain: the library declares no
//     `millisecond`. A1-A4 give every piece -- the `milli` prefix's factor of 1E-3, the
//     `ConversionByPrefix` mechanism that derives a unit's factor from its prefix, and `s` as the
//     DurationUnit -- and A5 shows the library's own spelling for assembling them. Part B below
//     assembles a millisecond by copying A5 and substituting `s` for `m`. That substitution is
//     this project's, not OMG's. It is a one-step instantiation of a declared mechanism, which is
//     why oracle.json records `normative-artifact` and names this bound rather than claiming the
//     library declares the unit.
//
// ============================================================================================
// PART B -- composed, NOT PARSED
// ============================================================================================

package QuantityUnitMagnitude {
    private import SI::s;
    private import SIPrefixes::milli;
    private import ISQBase::DurationValue;
    private import ISQBase::DurationUnit;
    private import MeasurementReferences::ConversionByPrefix;

    // A5's declaration with `s` substituted for `m`. This is the one composed step; see the BOUND
    // on A5.
    attribute <ms> millisecond : DurationUnit {
        :>> unitConversion: ConversionByPrefix { :>> prefix = milli; :>> referenceUnit = s; }
    }

    // Two charges written in milliseconds and a budget written in seconds. Each is a pair of a
    // number and exactly one measurement reference (A1), so the comparison below is between
    // magnitudes and not between the numerals 600 and 1.
    attribute stageA : DurationValue = 300 [ms];
    attribute stageB : DurationValue = 300 [ms];
    attribute budget : DurationValue = 1 [s];

    // The claim, as the standard's own notation would state it. 300 ms + 300 ms = 600 ms, and
    // 600 ms <= 1 s because 1 s = 1000 ms by milli's declared factor of 1E-3.
    constraint withinBudget { stageA + stageB <= budget }
}
