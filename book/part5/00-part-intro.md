<!-- part-foreshadows: modeling-principle, alignment-principle, seat-moves -->

A method induced from practice should explain the engineering history that produced it. This chapter
follows DocAble — a production document-accessibility system built largely by directing coding
agents — from a five-minute feasibility experiment to a deployed service. Observing one system from
the inside and from the beginning lets us reconstruct what a finished architecture cannot: which
pressures appeared, what response followed, what survived, and what had to be revised again.

The clean method arrived last. As the system grew, missing representation became expensive in some
places; missing enforcement became dangerous in others; repeated operational surprises exposed
properties nobody had modeled at all. Some obligations were encoded before failure. Some models
arose from clean design choices and simply held. Others were forged in incidents and hardened
through recurrence. {{chapter:evidence}} preserves those differences rather than forcing every event through the
finished theory.

<!-- principlebox -->
<!-- box-family: canonical -->
> ### Depth and breadth
>
> MAGE emerged from one deeply observed production build. That case supplies chronology, mechanism, and
> within-case recurrence.
>
> Independent industrial accounts supply a different kind of evidence: variation across systems built by
> other organizations under different constraints.
>
> **The first shows how the method emerged. The second asks how far its engineering grammar travels.**

**New here:** Originating case · Support ratio · Delegation staircase · Within-case evidence · Industrial reconstructions · Comparative evidence

{{chapter:evidence}} uses two views of the evidence; [ref:two-views-of-the-evidence] sets them side by side.

<!-- label: two-views-of-the-evidence -->
<!-- figure: assets/two-views-of-the-evidence.svg | *Two views of the evidence.* The originating case supplies longitudinal depth: sequence, mechanism, and within-case recurrence. Independent industrial reconstructions supply variation across systems and organizations but less process visibility. Together they motivate the theoretical account developed in Chapter 6. -->

DocAble supplies sequence, mechanism, and within-case recurrence, but not causal or population-level estimates. The eight industrial reconstructions supply variation and alternative realizations, but less process history. Together they motivate rather than establish the theoretical account developed in {{chapter:theory}}.

Chapters {{chapter:modeling|num}}–{{chapter:method|num}} presented the compressed method. Here the direction reverses. {{sec:the-ada-context}}–{{sec:failures}} return to the
originating case from which much of that terminology was induced, so the wrong turns matter. A finished
architecture shows what exists; a longitudinal case can show **why it exists and what it replaced**. {{sec:mage-in-the-wild}}
then asks whether independently built systems expose comparable structures. Depth supplies mechanism;
breadth supplies variation. {{chapter:theory}} asks what general account can explain both.
