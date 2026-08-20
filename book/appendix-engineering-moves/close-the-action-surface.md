**Problem.** When a consequential operation can occur through arbitrary routes, governance must account for an open-ended set of ways to change the system. Validators, provenance, and policy cannot cover paths they cannot enumerate.

**Move.** Route consequential actions through a bounded, named interface. A closed action surface exposes a finite set of operations, each of which can carry policy, provenance, and validation.

[ref:fig-move06] sets the open surface against the closed one.

<!-- label: fig-move06 -->
<!-- figure: assets/c6-close-action-surface.svg | *Open surface versus closed seam.* OPEN — an actor reaches a raw surface by many routes, including unknown ones. CLOSED — the actor passes through one seam that exposes a small set of named verbs, each able to stamp, validate, constrain, and observe. The distinction is encoded by shape, line style, and weight rather than color. -->

**Example — Document mutation.** DocAble routes remediation through a closed set of named mutator verbs. Because the verb set is finite, every verb can stamp provenance, register inserted content, and run the required checks. New capabilities must extend the verb set rather than introduce another ungoverned path.

**Example — Infrastructure access.** Raw queue operations are confined to one dispatch seam. Queue semantics and atomicity are encoded and reviewed at that seam rather than reconstructed at each call site.

**Related mechanisms:** Closed remediation-verb sets · PdfModel · Sole raw-Redis seam · ServiceClient · Canonical walkers · One Door Enforced.
