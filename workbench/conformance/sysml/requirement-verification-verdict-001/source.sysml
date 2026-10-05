// The STANDARD side of conformance fixture sysml/requirement-verification-verdict-001.
//
// Two parts, and the difference between them is the whole reason this file is not one block.
//
//   PART A is VERBATIM from OMG's normative machine-readable artifacts, with the artifact and the
//   line it came from on every excerpt. Nothing in Part A is this project's wording.
//
//   PART B is a minimal model this project COMPOSED in the standard's textual notation to exhibit
//   the concept. It has NOT been parsed by any tool -- we take no runtime dependency on the SysML
//   v2 Pilot Implementation (DESIGN-v02-semantics-261004.md section 35.1), so no parser has seen
//   it. Treat it as illustration. The correspondence claim in claim.md rests on Part A.
//
// Retrieval, so a later reader can repeat it rather than trust it: every Part A excerpt below was
// taken from a file fetched on 2026-10-05 from the URL beside it. SysML.xmi was 1,135,635 bytes and
// Systems-Library.kpar 27,577 bytes; the quoted element ids and line numbers were located in those
// bytes, not recalled.
//
// ON THE KNOWN NORMATIVE DEFECT: the shipped sysml/transition-guard-occurrence-001 fixture records
// that `deriveTransitionUsageGuardExpression` selects `kind = TransitionFeatureKind::trigger` where
// the surrounding text requires `::guard`, identically in the PDF and the XMI. THIS FIXTURE DOES
// NOT TOUCH THAT DERIVATION -- it cites requirement and verification-case material only. The
// derivations it does cite were each checked for the same copy-paste class, by comparing every
// cited ownedRule's `ownedComment` description against its OCL specification body:
// deriveRequirementDefinitionRequiredConstraint, deriveRequirementDefinitionAssumedConstraint,
// deriveVerificationCaseDefinitionVerifiedRequirement, checkRequirementDefinitionSpecialization and
// checkVerificationCaseSpecialization all AGREE with their descriptions. No routing-around was
// needed and none was done.
//
// ============================================================================================
// PART A -- verbatim normative excerpts
// ============================================================================================
//
// A1. Systems Library, `Requirements.sysml` lines 19-47 (OMG,
//     https://www.omg.org/spec/SysML/20250201/Systems-Library.kpar). The DECLARED computation of
//     requirement satisfaction. Verbatim:
//
//         private abstract constraint def RequirementConstraintCheck {
//             constraint assumptions[0..*] :> constraintChecks, subperformances { ... }
//             constraint constraints[0..*] :> constraintChecks, subperformances { ... }
//
//             return result = allTrue(assumptions()) implies allTrue(constraints()) {
//                 doc
//                 /*
//                  * If all the assumptions are true, then all the required constraints must hold.
//                  */
//             }
//         }
//
//     The `return result = ...` line is a declared expression, not a sentence: satisfaction IS the
//     value of that implication. With no assumptions declared it reduces to allTrue(constraints()).
//
// A2. The same file, line 49 -- the base type every requirement definition must specialize:
//
//         abstract requirement def RequirementCheck :> RequirementConstraintCheck { ... }
//
//     and lines 173-185, the two declared SUBSETS that carry assertion polarity:
//
//         abstract requirement satisfiedRequirementChecks :> requirementChecks, assertedConstraintChecks {
//             doc /* ... the subset of requirementChecks for Requirements asserted to be satisfied. */
//         }
//
//         abstract requirement notSatisfiedRequirementChecks: RequirementCheck[0..*] :> requirementChecks, negatedConstraintChecks {
//             doc /* ... the subset of requirementChecks for Requirements asserted to be not satisfied. */
//         }
//
//     Polarity is carried by WHICH SUBSET a usage joins -- asserted or negated -- and not by
//     rewriting the constraint. That is the declared counterpart of MAGE keeping the breach query
//     positive and putting the polarity in `satisfied_when`.
//
// A3. Systems Library, `VerificationCases.sysml` line 22 (same .kpar). The DECLARED shape of a
//     verdict. Verbatim:
//
//         return verdict : VerdictKind :>> result;
//
//     declared inside `abstract verification def VerificationCase :> Case` (line 13). `:>>` is
//     redefinition, so the verdict REDEFINES the case's return value. A verdict is the result of
//     performing a case; it is not an attribute of the thing being verified.
//
// A4. The same file, lines 58-68 -- the result vocabulary, declared as a closed enumeration.
//     Verbatim:
//
//         enum def VerdictKind {
//             doc
//             /*
//              * VerdictKind is an enumeration of the possible results of a VerificationCase.
//              */
//
//             pass;
//             fail;
//             inconclusive;
//             error;
//         }
//
// A5. The same file, lines 70-79 -- declared evidence that `inconclusive` and `error` are NOT the
//     image of a failed check. Verbatim:
//
//         calc def PassIf {
//             in attribute isPassing : Boolean;
//             return attribute verdict : VerdictKind = if isPassing? VerdictKind::pass else VerdictKind::fail;
//         }
//
//     A Boolean maps onto `pass` or `fail` and onto nothing else, so the other two literals are
//     reachable only by something other than a two-valued check. This is the declared material the
//     pinned claim's third arm rests on.
//
// A6. SysML.xmi (OMG, https://www.omg.org/spec/SysML/20250201/SysML.xmi). The declared chain from
//     the metaclasses to the library elements above:
//
//         packagedElement xmi:id="Systems-Requirements-RequirementDefinition"
//             ownedRule name="checkRequirementDefinitionSpecialization"
//                 body="specializesFromLibrary('Requirements::RequirementCheck')"
//
//         packagedElement xmi:id="Systems-VerificationCases-VerificationCaseDefinition"
//             ownedRule name="checkVerificationCaseSpecialization"
//                 body="specializesFromLibrary('VerificationCases::VerificationCase')"
//
//     and the derivation that separates a requirement's required constraints from its assumptions:
//
//         ownedRule name="deriveRequirementDefinitionRequiredConstraint"
//             body="requiredConstraint = ownedFeatureMembership->
//                       selectByKind(RequirementConstraintMembership)->
//                       select(kind = RequirementConstraintKind::requirement).
//                       ownedConstraint"
//
// A7. SysML v2.0, OMG Document Number formal/26-03-02, for the reader who wants the prose beside
//     the declarations. Clause 8.3.21.8 RequirementDefinition (page 357), Description:
//
//         A RequirementDefinition is a ConstraintDefinition that defines a requirement used in the
//         context of a specification as a constraint that a valid solution must satisfy.
//
//     Clause 8.3.24.3 VerificationCaseDefinition (page 375), Description:
//
//         A VerificationCaseDefinition is a CaseDefinition for the purpose of verification of the
//         subject of the case against its requirements.
//
//     Clause 9.2.17.2.2 VerdictKind, Features: error, fail, inconclusive, pass (listed
//     alphabetically there; A4's declaration order is pass, fail, inconclusive, error -- the same
//     four-member set).
//
// ============================================================================================
// PART B -- composed, NOT PARSED
// ============================================================================================

package RequirementVerificationVerdict {
    private import Requirements::*;
    private import VerificationCases::*;
    private import ScalarValues::*;

    enum def Sensitivity {
        public;
        internal;
        restricted;
    }

    part def Service {
        attribute permits : Sensitivity;
    }

    part def EventType {
        attribute carries : Sensitivity;
    }

    part def Subscription {
        ref part subscriber : Service[1];
        ref part received : EventType[1];
    }

    // THE requirement. Per A1 its satisfaction is the value of
    // `allTrue(assumptions()) implies allTrue(constraints())`; with no assumption declared, it is
    // the required constraint itself. Per A6 it specializes Requirements::RequirementCheck.
    requirement def NoImpermittedSubscription {
        subject sub : Subscription;

        require constraint {
            sub.subscriber.permits >= sub.received.carries
        }
    }

    // THE verification case that discharges it. Per A3 its return is a VerdictKind, so the verdict
    // is produced by performing this case and is stored on nothing. Per A4 the verdict has four
    // possible values, and per A5 only two of them are the image of a Boolean check.
    verification def CheckNoImpermittedSubscription {
        subject sub : Subscription;

        objective {
            verify requirement NoImpermittedSubscription;
        }

        return verdict : VerdictKind;
    }
}
