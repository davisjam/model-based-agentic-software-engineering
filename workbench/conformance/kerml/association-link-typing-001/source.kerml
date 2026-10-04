// The STANDARD side of conformance fixture kerml/association-link-typing-001.
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
// ============================================================================================
// PART A -- verbatim normative excerpts
// ============================================================================================
//
// A1. KerML.xmi, element id `Kernel-Associations-Association` (OMG, KerML 1.0,
//     https://www.omg.org/spec/KerML/20250201/KerML.xmi). The generalizations, as declared:
//
//         <generalization><general xmi:idref="Core-Classifiers-Classifier"/></generalization>
//         <generalization><general xmi:idref="Root-Elements-Relationship"/></generalization>
//
//     and the constraint named `checkAssociationSpecialization`, whose specification is:
//
//         specializesFromLibrary('Links::Link')
//
// A2. Kernel Semantic Library, `Links.kerml` lines 10-30 (OMG,
//     https://www.omg.org/spec/KerML/20250201/Semantic-Library.kpar). Verbatim:
//
//         abstract assoc Link specializes Anything {
//             feature participant: Anything[2..*] nonunique ordered;
//         }
//
//         assoc all BinaryLink specializes Link {
//             feature participant: Anything[2] nonunique ordered redefines Link::participant;
//
//             end feature source: Anything[1] subsets participant;
//             end feature target: Anything[1] subsets participant;
//         }
//
// A3. The same file, lines 41-64 -- the declaration pattern by which a link POPULATION is narrowed
//     to a type. Verbatim:
//
//         abstract feature links: Link[0..*] nonunique subsets things { ... }
//
//         abstract feature binaryLinks: BinaryLink[0..*] nonunique subsets links {
//             doc
//             /*
//              * binaryLinks is a specialization of links restricted to type BinaryLink.
//              */
//         }
//
//         abstract feature selfLinks: SelfLink[0..*] nonunique subsets binaryLinks { ... }
//
//     A3 is the part claim.md leans on hardest and also the part whose reading is an inference
//     rather than a lookup: the library EXHIBITS the pattern for its own three association types
//     and declares no general rule obliging it for a user-defined one. claim.md says so, and
//     oracle.json records the fixture as `spec-inspected` for that reason.
//
// ============================================================================================
// PART B -- composed, NOT PARSED
// ============================================================================================

package AssociationLinkTyping {
    private import Links::binaryLinks;

    classifier Component;
    classifier Store;

    // Two association types over the same participants. Each is a Classifier (A1), so each
    // classifies a population of links, and that population is reached by restricting `links`
    // to the type (A3).
    assoc Conveys specializes Links::BinaryLink {
        end feature source: Component[1] redefines Links::BinaryLink::source;
        end feature target: Component[1] redefines Links::BinaryLink::target;
    }

    assoc Records specializes Links::BinaryLink {
        end feature source: Component[1] redefines Links::BinaryLink::source;
        end feature target: Store[1] redefines Links::BinaryLink::target;
    }

    feature conveysLinks: Conveys[0..*] nonunique subsets binaryLinks;
    feature recordsLinks: Records[0..*] nonunique subsets binaryLinks;
}
