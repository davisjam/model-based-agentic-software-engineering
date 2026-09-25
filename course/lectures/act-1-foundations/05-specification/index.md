---
title: Specification
readings:
  groups:
    - heading: Foundations
      items:
        - cite: zave1997darkcorners
          annotation: '["Four Dark Corners of Requirements Engineering."](https://doi.org/10.1145/237432.237434) Zave and Jackson, 1997. A classic treatment of the relationships among requirements, environmental assumptions, specifications, and implementations. **Read** §1 and the opening of §5 (through the definition of the satisfaction relation, S, K ⊢ R); **skim** §3.2 and §5–5.1. Focus on the distinction among requirements, specifications, and domain assumptions, and on why a requirement may need to be refined before an implementor can build from it.'
    - heading: Specifications in practice
      items:
        - cite: alspaugh1992a7e
          annotation: '["Software Requirements for the A-7E Aircraft."](readings/software-requirements-for-the-a7e-aircraft.pdf) Alspaugh, Faulk, Britton, Parker, Parnas, and Shore, 1992. A substantial real software requirements specification. Skim rather than reading linearly. Pay particular attention to how the document specifies externally visible behavior without unnecessarily prescribing implementation, its requirements for useful functional subsets, its treatment of expected changes, and the different representations used to make different obligations explicit.'
    - heading: Modeling and representation
      items:
        - cite: davis2026mage
          locator: 'Part II introduction and §2.1'
          annotation: '[MAGE, Part II — Introduction](https://davisjam.github.io/model-based-agentic-software-engineering/book/mage-book/part-2-intro.html) and {mage:2.1}. Read the Part II introduction and §2.1 together as one reading. The introduction frames modeling: why large systems are understood through purposeful views, and why commodity intelligence changes the economics that once kept explicit models secondary in code-centric practice. §2.1 then introduces models as purposeful reductions — representations chosen to make particular engineering questions tractable — and develops properties, invariants, acceptable realization spaces, and degrees of freedom as tools for reasoning about what should be constrained and what should remain open.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Specification
    src: slides/1-5-Specification.pptx
---

**Premise.** *Requirements establish what engineers have decided to promise. Specification determines what those commitments require of the machine and its environment, while preserving choices that do not matter.*

Requirements establish commitments grounded in an understanding of what stakeholders need, how they expect to interact with the machine, and the world in which that interaction occurs. They do not yet determine exactly what the machine must guarantee. Specification carries that understanding forward by determining what the commitments require of the machine and its environment while preserving choices that do not matter. Because some unresolved distinctions are consequential and some uncertain, specification requires judgment rather than maximal detail.

Specification makes three judgments:

- **Where should specification effort go?** The aspects of the accepted requirements that are both consequential and uncertain deserve specification and feedback first.
- **Where does responsibility belong?** Engineers decide what the environment must provide and what the machine must guarantee — the boundary is itself an engineering choice.
- **How tightly should the machine be constrained?** For each distinction among possible realizations: constrain it, leave it open, or learn more.

## Where should specification effort go?

Start with consequence and uncertainty. Not every unresolved question deserves equal attention. Consequence asks how much it would matter if engineers chose the wrong boundary: whether a requirement is satisfied, an important quality preserved, a future change kept practical. Uncertainty asks how confidently engineers understand that decision and its consequences.

Together they set the priority. A consequential property that is already well understood may simply need to be stated precisely. An uncertain choice whose alternatives have little consequence can remain unresolved. A property that is both consequential and uncertain deserves investigation first, through modeling, analysis, prototyping, or feedback, because what engineers learn may change the specification itself. That learning can also flow upward: specification may reveal that an accepted commitment rests on an implausible assumption, or leaves a consequential choice unresolved, and so send engineers back to reconsider what they have promised.

## Where does responsibility belong?

A requirement describes something we want to be true in the world. Requirements work gives us an understanding of that world and of how stakeholders expect the machine to participate in it, but the machine directly controls only its own behavior. Specification turns that understanding into an allocation of responsibility. Following Zave and Jackson: requirements describe desired properties of the world, environmental assumptions describe what the surrounding world provides, and the machine specification constrains what the machine guarantees at its boundary with that world. The engineering claim is that assumptions and specification together establish the requirement. A program can perfectly satisfy its machine specification and still fail the requirement when a required environmental assumption does not hold.

The boundary is not simply discovered. Engineers decide where responsibility resides. A system might assume that its input is valid, or it might be required to validate that input itself. Each choice changes what the machine is responsible for doing.

Scope decisions move this boundary. Reducing scope, or de-risking, often strengthens the environmental assumptions so that the machine's obligations shrink; automation and scope creep move responsibility the other way, into the machine. Neither necessarily removes complexity — it is reallocated. A simpler machine may demand a more capable operator or a more controlled deployment, so moving responsibility into the environment is acceptable only when the resulting assumption is itself acceptable. Specification makes that trade visible.

## How tightly should the machine be constrained?

Once responsibility is allocated, engineers decide how tightly to bound the machine's behavior. A specification bounds a realization space rather than selecting one implementation: each obligation rules out some possible realizations, and what remains is the set engineers are prepared to accept. The question is not how much detail a specification should contain. It is which differences among possible realizations are consequential enough to constrain. Three moves carry that judgment:

- **Represent.** Engineers cannot judge what they cannot see. Choose a representation that makes the consequential property visible: engineering question → representation → property → analysis or check. A state model exposes allowable behavior; an activity model exposes ordering and dependency; a schema exposes the structure of information crossing a boundary; a table exposes combinations of conditions and required responses. No single representation needs to describe everything; a system may need several purposeful views.

- **Decide.** An apparent degree of freedom can mean three things. An unknown — engineers do not yet understand whether the distinction is consequential — calls for learning. A tacit constraint — the distinction matters but its boundary has never been made explicit — calls for externalization. A genuinely free choice should remain open. Constrain a distinction when its alternatives differ consequentially; leave it open when they are acceptable; learn more when the consequences are uncertain.

- **Learn.** Models, prototypes, experiments, and stakeholder feedback buy information about the consequential uncertainties. Evidence may justify a new constraint, reveal a tacit one, or show that a choice can safely remain free. The cost runs both ways: overspecification turns cheap future choices into present commitments that later engineers must preserve or deliberately revise; underspecification delegates a consequential choice downstream without making the obligation visible.

## Measurement for decision-making

A specification claims what the machine must guarantee and what its environment may be assumed to provide. Both are claims about reality, so reality can be consulted about both. If the specification assumes an upstream service responds within five seconds, production traces test that assumption directly. If a state model says an advisory may be issued only after consent, recorded executions can be checked for transitions the model forbids. The measurement is useful because the specification told engineers which distinction to look for.

The more interesting evidence arrives when nothing appears to be wrong: the machine satisfies its obligations, the assumptions appear to hold, and the required outcome still does not follow. Conformance testing will not find that, because the machine conforms. The discrepancy is evidence against the specification itself, and the question becomes *does our model of machine and environment still describe consequential reality?*

## From specification to architecture

Specification leaves a bounded space of acceptable realizations, not a complete design. The obligations that bound the space — state behavior, information structures, timing, expected change — may have been stated through different views, but they must eventually coexist in one system. Architecture begins from that bounded space. Its problem is no longer which realizations are acceptable, but how to organize one acceptable realization so that its competing obligations can be satisfied together.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Specification" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/05-specification.html)
