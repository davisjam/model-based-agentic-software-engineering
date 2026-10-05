// The STANDARD side of conformance fixture kerml/binding-connector-identity-001.
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
// taken from a file fetched on 2026-10-05 from the URL beside it. KerML.xmi was 962,254 bytes and
// Semantic-Library.kpar 33,031 bytes; the quoted element ids and line numbers were located in
// those bytes, not recalled.
//
// ============================================================================================
// PART A -- verbatim normative excerpts
// ============================================================================================
//
// A1. KerML.xmi, element id `Kernel-Connectors-BindingConnector` (OMG, KerML 1.0,
//     https://www.omg.org/spec/KerML/20250201/KerML.xmi). The generalization, as declared:
//
//         <generalization><general xmi:idref="Kernel-Connectors-Connector"/></generalization>
//
//     and the element's two ownedRule constraints, with their specification bodies verbatim:
//
//         name="validateBindingConnectorIsBinary"
//             body="relatedFeature->size() = 2"           language="OCL2.0"
//
//         name="checkBindingConnectorSpecialization"
//             body="specializesFromLibrary('Links::selfLinks')"   language="OCL2.0"
//
//     These two are DECLARED invariants on the metaclass, so they hold of every BindingConnector
//     rather than being exhibited by an example. They are what the fixture's structural half
//     rests on.
//
// A2. The same element's `ownedComment` body (prose, and marked as such here because claim.md
//     leans on it for the decisive step):
//
//         A `BindingConnector` is a binary `Connector` that requires its `relatedFeatures` to
//         identify the same things (have the same values).
//
// A3. Kernel Semantic Library, `Links.kerml` lines 32-41 (OMG,
//     https://www.omg.org/spec/KerML/20250201/Semantic-Library.kpar). Verbatim:
//
//         assoc all SelfLink specializes BinaryLink {
//             doc
//             /*
//              * SelfLink is a binary association in which the things at the two ends are asserted
//              * to be the same.
//              */
//
//             end feature thisThing: Anything redefines source subsets sameThing crosses sameThing.self;
//             end self2 [1] feature sameThing: Anything redefines target subsets thisThing;
//         }
//
//     The two `end feature` lines are the declared half: each end subsets the other. The `doc`
//     comment above them states what that mutual subsetting MEANS, and it is a sentence.
//
// A4. The same file, lines 57-65 -- the Feature that A1's second constraint names. Verbatim:
//
//         abstract feature selfLinks: SelfLink[0..*] nonunique subsets binaryLinks {
//             doc
//             /*
//              * selfLinks is a specialization of binaryLinks restricted to type SelfLink.
//              */
//
//             end feature thisThing: Anything redefines SelfLink::thisThing, binaryLinks::source;
//             end feature sameThing: Anything redefines SelfLink::sameThing, binaryLinks::target;
//         }
//
// A5. KerML 1.0, OMG Document Number formal/26-03-01, clause 8.4.4.6.2 Binding Connectors
//     (page 262 of the normative PDF, https://www.omg.org/spec/KerML/1.0/PDF). Verbatim, and this
//     is THE DECISIVE STEP and it is prose -- which is why oracle.json records this fixture as
//     `spec-inspected` and not `normative-artifact`:
//
//         The checkBindingConnectorSpecialization constraint requires that BindingConnectors
//         specialize the Feature Links::selfLinks (see 9.2.3.2.6 ), which is typed by the
//         Association SelfLink (see 9.2.3.2.5 ). SelfLink has two associationEnds that subset
//         each other, meaning they identify the same things (have the same values), which then
//         also applies to BindingConnector connectorEnds that redefine the associationEnds of
//         SelfLink.
//
//     The sentence "subset each other, meaning they identify the same things" is the inference
//     from the declared mutual subsetting in A3 to identity. KerML's `Subsetting` metaclass
//     (`Core-Features-Subsetting` in KerML.xmi) carries three ownedRule constraints --
//     validateSubsettingConstantConformance, validateSubsettingUniquenessConformance,
//     validateSubsettingFeaturingTypes -- and NONE of them declares extension containment, so the
//     step cannot be taken from declared OCL alone. claim.md says so and the rung records it.
//
// A6. The abstract-syntax clause, for the reader who wants the Description beside the XMI comment:
//     KerML 1.0 clause 8.3.4.5.2 Binding Connector (page 185). Its Description is A2 verbatim.
//
// ============================================================================================
// PART B -- composed, NOT PARSED
// ============================================================================================

package BindingConnectorIdentity {
    private import Links::selfLinks;

    classifier Component;

    // Two packages, each declaring its own view of one shared component. This is the standard-side
    // analogue of two MAGE purposeful models naming one entity id: on the KerML side the identity
    // must be ASSERTED by a connector, which is exactly the capability MAGE does not give an
    // author (see claim.md, "What this fixture does NOT establish").
    package Upstream {
        feature alpha: Component[1];
        feature sharedAsSeenUpstream: Component[1];
    }

    package Downstream {
        feature sharedAsSeenDownstream: Component[1];
        feature omega: Component[1];
    }

    // THE binding. Per A1 it is binary and must specialize Links::selfLinks; per A3 and A5 its two
    // ends therefore identify the same thing. The two packages' separate features denote one
    // component because this connector says so.
    binding junction: BindingConnector
        subsets selfLinks
        connect Upstream::sharedAsSeenUpstream to Downstream::sharedAsSeenDownstream;

    assoc Conveys specializes Links::BinaryLink {
        end feature source: Component[1] redefines Links::BinaryLink::source;
        end feature target: Component[1] redefines Links::BinaryLink::target;
    }

    feature conveysLinks: Conveys[0..*] nonunique subsets Links::binaryLinks;
}
