// The STANDARD side of conformance fixture sysml/transition-guard-occurrence-001.
//
// Two parts. PART A is VERBATIM from OMG's normative machine-readable artifacts, with the artifact
// and the line on every excerpt. PART B is a minimal model this project COMPOSED in the standard's
// textual notation; it has NOT been parsed by any tool, because we take no runtime dependency on
// the SysML v2 Pilot Implementation (DESIGN-v02-semantics-261004.md section 35.1). The
// correspondence claim in claim.md rests on Part A.
//
// ============================================================================================
// PART A -- verbatim normative excerpts
// ============================================================================================
//
// A1. Kernel Semantic Library, `TransitionPerformances.kerml` lines 21-65 (OMG,
//     https://www.omg.org/spec/KerML/20250201/Semantic-Library.kpar). This is the DECISIVE
//     excerpt: the invariant on the last line is what makes the guard a condition on OCCURRENCE
//     rather than an annotation on an edge. Verbatim, abridged to the five declarations the claim
//     uses:
//
//         abstract behavior TransitionPerformance {
//             in feature transitionLinkSource: Performance[1];
//
//             bool guard[*] subsets enclosedPerformances;
//             feature transitionLink: HappensBefore[0..1];
//
//             private connector all guardConstraint: TPCGuardConstraint[*]
//                 from [0..1] transitionLink to [*] guard;
//         }
//
//         assoc struct TPCGuardConstraint {
//             end guardedLink [0..1] feature constrainedHBLink: HappensBefore;
//             end bool constrainedGuard;
//
//             private inv { allTrue(constrainedGuard()) }
//         }
//
//     Read structurally and with no sentence in between: a `transitionLink` is a `HappensBefore`
//     of multiplicity [0..1] -- so a transition MAY have none -- and every `transitionLink` is
//     connected to its `guard`s by `TPCGuardConstraint`, which carries the invariant
//     `allTrue(constrainedGuard())`. A HappensBefore link therefore exists only where every guard
//     evaluates true, and where no guard can, the multiplicity's lower bound of 0 is what the
//     transition gets.
//
// A2. SysML.xmi, element id `Systems-States-TransitionUsage` (OMG, SysML v2.0,
//     https://www.omg.org/spec/SysML/20250201/SysML.xmi), ownedComment, verbatim:
//
//         A TransitionUsage is an ActionUsage representing a triggered transition between
//         ActionUsages or StateUsages. When triggered by a triggerAction, when its
//         guardExpression is true, the TransitionUsage asserts that its source is exited, then
//         its effectAction (if any) is performed, and then its target is entered.
//
//     and the `succession` attribute's own comment:
//
//         The Succession that is the ownedFeature of this TransitionUsage, which, if the
//         TransitionUsage is triggered, asserts the temporal ordering of the source and target.
//
//     A2 says the same thing as A1 in prose. It corroborates; A1 decides.
//
// A3. Systems Library, `Actions.sysml` lines 325-343, which binds a SysML TransitionUsage to A1's
//     KerML behavior (OMG, https://www.omg.org/spec/SysML/20250201/Systems-Library.kpar).
//     Verbatim, abridged:
//
//         abstract action def TransitionAction :> Action, TransitionPerformance {
//             doc
//             /*
//              * A TransitionAction is a TransitionPerformance with an Action as
//              * transitionLinkSource. It is the base type of all TransitionUsages.
//              */
//         }
//
//     together with SysML.xmi's ownedRule `checkTransitionUsageSpecialization`, whose
//     specification is `specializesFromLibrary('Actions::transitionActions')`. That chain is why
//     A1's invariant governs a SysML state transition and not only a KerML one.
//
// A4. DEFECT in the normative artifacts, recorded because this fixture had to route around it.
//     SysML v2.0 formal/2026-03-02 clause 8.3.18.9, constraint `deriveTransitionUsageGuardExpression`,
//     derives `guardExpression` by selecting `kind = TransitionFeatureKind::trigger` -- the wrong
//     enum literal -- and its prose description reads "The triggerActions of a TransitionUsage
//     are...", copied from the sibling constraint. SysML.xmi carries the identical body. The claim
//     in claim.md therefore rests on A1 and A2, NEITHER of which depends on that derivation.
//     Reported in the wave's findings; not filed upstream by this wave.
//
// ============================================================================================
// PART B -- composed, NOT PARSED
// ============================================================================================

package TransitionGuardOccurrence {
    attribute def KeyState { attribute value : ScalarValues::Integer; }

    part def Gate {
        attribute key : ScalarValues::Integer = 0;

        state gateStates {
            entry; then closed;

            state closed;
            state armed;
            state open;

            transition arm      first closed then armed;
            transition disarm   first armed  then closed;

            // The guarded edge. Nothing in this state machine assigns `key`, so the guard's
            // Evaluation never has result value true, so TPCGuardConstraint's invariant (A1) is
            // satisfiable only by the transitionLink having no value. `open` is drawn and is not
            // entered.
            transition unlock   first armed if key == 1 then open;
        }
    }
}
