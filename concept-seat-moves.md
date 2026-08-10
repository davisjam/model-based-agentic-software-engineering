# The lifecycle stays, but now agents sit in the developer's seat

**Claim** — SDLC becomes SELC: one seat reassigned, the lifecycle otherwise intact. The fleet writes the code; the engineer keeps the seats that were always the engineering.

| Concept | Big idea 6 · the seat |
| --- | --- |
| Claim | SDLC becomes SELC: one seat reassigned, the lifecycle otherwise intact. The fleet writes the code; the engineer keeps the seats that were always the engineering. |
| Mechanisms | Independent pre-implementation design review · Epic & design-doc templates · Epic Definition-of-Done |
| Related | Convert recurring failures into controls |
| In the book | book/1.6-the-engineers-seat.html |

## The idea

<!-- fig: 0 -->

The software lifecycle does not dissolve when agents write the code. Requirements, specification, design,
implementation, validation — the stages stay, and the work each names still has to happen. What changes
is who fills one seat. The fleet takes implementation; the rest of the seats stay with the engineer. SDLC
becomes SELC, one seat reassigned and the lifecycle otherwise intact.

<!-- more -->

The engineer flanks the fleet. On one side, models carry intent *in* — the specification of what a right
answer looks like, the design of the structure the fleet reasons through. On the other, judgment meets
the output — validation against the metric, the call on whether the work advances. The seats the human
keeps are the ones that decide what gets built and whether it is right, and those were always the
consequential seats. Now they are the whole job.

So the reassignment is narrow and its consequence is wide. Exactly one activity moved, the typing of the
code, and it was never the hard part. The engineer specifies, designs the model, and judges the result;
the fleet fills in between. The lifecycle a working engineer already knows is the lifecycle that stays.

## Why it's more than the same job with faster typing

"Faster typing" says implementation got cheaper and nothing else moved. But when implementation turns
abundant, the scarce input shifts, and the bottleneck moves with it — to the seats that decide what to
build and whether it holds. Those seats do not get automated by a faster printer; they get *heavier*,
because more built code flows through each judgment they make.

The job is not the old one done quicker. It is the old one with its weight moved to the ends —
specification and design at the front, validation at the back — while the middle, once the expensive
part, becomes the cheap part. Mistake it for faster typing and you staff for the wrong skill: the fleet
needs someone who can specify and judge, not someone who types a little faster.

## The mechanisms that instantiate it

- [Independent pre-implementation design review](agent/governance-doc-controls/independent-design-review.md)
- [Epic & design-doc templates](agent/governance-doc-controls/epic-and-design-templates.md)
- [Epic Definition-of-Done](agent/governance-doc-controls/epic-definition-of-done.md)

## Related concepts

- [Convert recurring failures into controls](concept-convert-failures.md)

## Read in the book →

[Read in the book →](book/1.6-the-engineers-seat.html)
