<!-- part-foreshadows: modeling-principle, alignment-principle, seat-moves -->

A method induced from practice should explain the engineering history that produced it. This Part
follows DocAble — a production document-accessibility system built largely by directing coding
agents — from a five-minute feasibility experiment to a deployed service. Observing one system from
the inside and from the beginning lets us reconstruct what a finished architecture cannot: which
pressures appeared, what response followed, what survived, and what had to be revised again.

The clean method arrived last. As the system grew, missing representation became expensive in some
places; missing authority became dangerous in others; repeated operational surprises exposed
properties nobody had modeled at all. Some obligations were encoded before failure. Some models
arose from clean design choices and simply held. Others were forged in incidents and hardened
through recurrence. Part V preserves those differences rather than forcing every event through the
finished theory.

<!-- principlebox -->
> ### DEPTH AND BREADTH
>
> MAGE emerged from one deeply observed production build. That case supplies chronology, mechanism, and
> within-case recurrence.
>
> Independent industrial accounts supply a different kind of evidence: variation across systems built by
> other organizations under different constraints.
>
> **The first shows how the method emerged. The second asks how far its engineering grammar travels.**

**New here:** Originating case · Support ratio · Delegation staircase · Within-case evidence · Industrial reconstructions · Comparative evidence

Part V uses two views of the evidence; [ref:two-views-of-the-evidence] sets them side by side.

<!-- label: two-views-of-the-evidence -->
<!-- figure: assets/two-views-of-the-evidence.svg | *Two views of the evidence.* The originating case supplies longitudinal depth: sequence, mechanism, and within-case recurrence. Independent industrial reconstructions supply variation across systems and organizations but less process visibility. Together they motivate the theoretical account developed in Part VI. -->

The evidence in this Part comes in two forms. The first is longitudinal process evidence from DocAble. It can
establish sequence: this failure occurred, this response followed, and later evidence showed whether the
same failure recurred over the measured surface. It can show observed recurrence and nonrecurrence within one
system and reconstruct how particular engineering structures emerged. It cannot establish that MAGE caused every improvement, that
another organization would encounter the same failures, or that the resulting quantities are universal targets.

The final chapter widens the lens. Six public industrial accounts describe how independent organizations structure
autonomous engineering work under different constraints. Those accounts lack DocAble's process depth: they
expose selected mechanisms rather than the full histories that produced them. Their value is variation. They
can show comparable moves arising independently, different realizations of the same engineering problem, and
boundaries the originating case could not expose.

Parts II–IV presented the compressed method. Here the direction reverses. Chapters 5.1–5.4 return to the
originating case from which much of that terminology was induced, so the wrong turns matter. A finished
architecture shows what exists; a longitudinal case can show **why it exists and what it replaced**. Chapter
5.5 then asks whether independently built systems expose comparable structures. Depth supplies mechanism;
breadth supplies variation. Part VI asks what general account can explain both.
