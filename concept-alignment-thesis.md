# Hold intent with a mechanism: prevent first, sense the rest

**Claim** — Enforced mechanisms hold work to intent across later changes. Constrain first so the wrong move is unavailable; where prevention falls short, a sensor catches the drift.

| Concept | Big idea 3 · Thesis 2 |
| --- | --- |
| Claim | Enforced mechanisms hold work to intent across later changes. Constrain first so the wrong move is unavailable; where prevention falls short, a sensor catches the drift. |
| Mechanisms | Typed ViolationCategory / FailureCategory enums · The Audit-to-Lint mechanism · ContentValidator · F10 mutator-stamp-wiring lint |
| Related | Documentation, taken to its limit, is a structured model · Convert recurring failures into controls |
| In the book | book/3.3-constraints-sensors-validators-gates.html |

## The idea

<!-- fig: 0 -->

A probabilistic reasoner cannot certify its own output, and its confidence is not evidence. The same
prompt can yield a right answer today and a wrong one tomorrow, and the model reports both with the same
assurance. So correctness cannot rest on the agent's promise. It has to rest on a mechanism outside the
agent — decided once, and checked on every later change no matter who made it.

Two moves cover the ground, in order. **Constrain first:** make the wrong move unavailable. A typed
seam, a banned raw API, an action surface that offers only sanctioned operations — the failing state
never gets built because the environment does not expose the path to it. **Then sense the rest:** where
prevention cannot reach, catch the drift after the fact with a lint, a validator, or a gate that refuses
to let the violation advance.

<!-- more -->

Prefer prevention wherever it reaches. A constraint the compiler enforces is cheaper and surer than a
sensor that catches the miss, because the wrong state simply cannot exist — there is nothing to detect.
But not everything can be made impossible, and a policy that resists hard encoding still needs holding,
so a sensor covers what a constraint cannot. A costly goal earns both: a constraint to make the common
wrong move unavailable, a sensor to catch the exotic one that slips past. What neither can reach stays a
human's job, named honestly rather than hidden.

## Why it's more than writing more tests

A test is a sensor, and a good one, but it works late and narrow. It runs after the wrong code already
exists, and it catches only what a case happens to exercise; the move it never thought to test stays a
live hazard. Adding more tests adds more sensors — it never adds a constraint.

The thesis puts prevention first. A constraint works earlier and wider than any test: it makes the wrong
move unavailable, so the failing state is never built and no test is needed to catch it. "Prevent first,
sense the rest" is not "sense more." A suite that only senses leaves every unprevented move waiting for a
case that may never be written.

## The mechanisms that instantiate it

- [Typed ViolationCategory / FailureCategory enums](product/repair-vocabulary/typed-categories.md)
- [The Audit-to-Lint mechanism](product/validation-and-conformance/semantic-lints.md)
- [ContentValidator](product/validation-and-conformance/content-validator.md)
- [F10 mutator-stamp-wiring lint](product/provenance-and-attribution/f10-wiring-lint.md)

## Related concepts

- [Documentation, taken to its limit, is a structured model](concept-modeling-thesis.md)
- [Convert recurring failures into controls](concept-convert-failures.md)

## Read in the book →

[Read in the book →](book/3.3-constraints-sensors-validators-gates.html)
