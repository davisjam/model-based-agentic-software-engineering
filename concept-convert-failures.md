# Convert recurring failures into controls

**Claim** — Velocity surfaces the failures you could not foresee. Convert each recurring one into a mechanism, pushed as far toward hard enforcement as it will go.

| Concept | Big idea 5 · the practice |
| --- | --- |
| Claim | Velocity surfaces the failures you could not foresee. Convert each recurring one into a mechanism, pushed as far toward hard enforcement as it will go. |
| Mechanisms | Self-governance · The Audit-to-Lint mechanism · Cross-source coherence lints · DDT pin-trailers |
| Related | Hold intent with a mechanism: prevent first, sense the rest · The lifecycle stays, but now agents sit in the developer's seat |
| In the book | book/3.3-the-governed-environment.html |

## The idea

<!-- fig: 0 -->

You cannot foresee every failure a fast fleet will find. Velocity is what surfaces them: agents moving
at scale reach edges no specification named and no designer pictured. Trying to enumerate them all up
front is a losing game. The practice is the opposite — let velocity expose the failures, then convert
each recurring one into a mechanism the environment enforces.

<!-- more -->

The place a failure lands is a point on a spectrum, and the practice is a direction along it. A
convention or a brief aims the agent but cannot block it; a lint or a gate holds the line whether the
agent cooperates or not. When a soft rule fails a second time, that recurrence is the signal to move it
right: the documented rule becomes a lint the agent cannot talk past, or a gate the deploy cannot skip.

<!-- fig: 1 -->

Push each conversion as far toward hard enforcement as the failure admits — hard where the wrong state
can be made impossible, soft where it genuinely cannot, but never leave a recurring failure resting on
"we will remember." Each conversion retires one class and adds one member to the control substrate, which
grows a failure at a time into the environment that later work stands on.

## Why it's more than fixing the bug

Fixing the bug closes this instance and leaves the class open. The next agent — the one who never read
the postmortem, because every context starts cold — walks straight back into it. The failure recurs
because nothing in the environment changed; only the code did, once.

Converting to a control closes the class. The failure that recurred cannot recur again, because the
ground now refuses it, and it refuses it for every future agent without anyone remembering to check. The
cost is paid once, at conversion, and amortized across all the work that comes after. A fix is a patch on
one spot; a control is a property of the whole environment.

## The mechanisms that instantiate it

- [Self-governance](agent/governance-doc-controls/self-governance.md)
- [The Audit-to-Lint mechanism](product/validation-and-conformance/semantic-lints.md)
- [Cross-source coherence lints](product/validation-and-conformance/coherence-lints.md)
- [DDT pin-trailers](product/regression-tests/ddt-pin-trailers.md)

## Related concepts

- [Hold intent with a mechanism: prevent first, sense the rest](concept-alignment-thesis.md)
- [The lifecycle stays, but now agents sit in the developer's seat](concept-seat-moves.md)

## Read in the book →

[Read in the book →](book/3.3-the-governed-environment.html)
