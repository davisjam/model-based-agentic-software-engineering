**Problem.** When a consequential operation can happen through arbitrary routes, complete governance is hard to even state. Every validator, provenance mechanism, and policy has to reason about an open-ended set of ways the change might have occurred. Anything might have happened, so nothing can be guaranteed.

**Move.** Route consequential actions through a bounded, named interface. A closed action surface converts "anything might happen" into a finite set of moves, and each move can then carry policy, evidence, and validation.

[ref:fig-move06] sets the open surface against the closed one.

<!-- label: fig-move06 -->
<!-- figure: assets/c6-close-action-surface.svg | *Open surface versus closed seam.* OPEN — an actor reaches a raw surface by many routes, including unknown ones. CLOSED — the actor passes through one seam that exposes a small set of named verbs, each able to stamp, validate, constrain, and observe. Read by shape, dash, and weight, not colour. -->

**Example — Document mutation.** DocAble routes remediation through a closed set of named mutator verbs. Because the move set is enumerable, each verb can be required to stamp provenance, register inserted content, and take part in validation. Adding capability means deliberately extending the verb set, not silently opening another mutation route that the validators know nothing about.

**Example — Infrastructure access.** The same move appears at a completely different layer. Raw queue operations are confined to one dispatch seam. Queue semantics and atomicity get encoded and reviewed once, at the seam, rather than reconstructed wherever a caller happens to touch the store — where one careless call would otherwise be enough to break the invariant.

**Explore:** Closed remediation-verb sets · PdfModel · Sole raw-Redis seam · ServiceClient · Canonical walkers · One Door Enforced. (MAGE Mechanism Catalog.)
