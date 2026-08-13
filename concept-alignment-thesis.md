# Give intent authority: constrain, sense, validate, gate

**Claim** — Give intent authority over the fleet: constrain the wrong move away, then sense evidence, validate it, and gate what may advance — sensor produces, validator judges.

| Concept | Big idea 3 · Thesis 2 |
| --- | --- |
| Claim | Give intent authority over the fleet: constrain the wrong move away, then sense evidence, validate it, and gate what may advance — sensor produces, validator judges. |
| Mechanisms | Typed ViolationCategory / FailureCategory enums · The Audit-to-Lint mechanism · ContentValidator · F10 mutator-stamp-wiring lint |
| Related | Documentation, taken to its limit, is a structured model · Convert recurring failures into controls |
| In the book | book/3.3-constraints-sensors-validators-gates.html |

## The idea

<!-- fig: 0 -->

A probabilistic reasoner cannot certify its own output, and its confidence is not evidence. The same
prompt can yield a right answer today and a wrong one tomorrow, and the model reports both with equal
assurance. So correctness cannot rest on the agent's promise. It has to rest on a mechanism outside the
agent — decided once, and checked on every later change no matter who made it.

Alignment names four roles that mechanism can play. A **constraint** removes the wrong move from the
action space. A **sensor** observes the work and produces evidence. A **validator** evaluates that
evidence against the obligation. A **gate** controls whether the work may advance. One tool often bundles
several; the four stay useful because they separate the distinct moves — prevention, observation,
judgment, admission — a single tool blurs together.

<!-- more -->

## Constrain first; sense, validate, and gate the rest

Prefer prevention wherever it reaches. A constraint the compiler enforces is cheaper and surer than a
sensor that catches the miss, because the wrong state simply cannot be built — there is nothing to
observe. But not everything can be made impossible, so the other three roles cover what a constraint
cannot.

- **The sensor produces evidence; it does not judge.** A log line, a trace, a metric, a scan that reads
  the actual calls out of the code — `actual = observe(system)`. It says what happened, not whether that
  was acceptable. A raw sensor is only as good as the observability under it.
- **The validator turns evidence into a judgment.** It reads what the sensor produced, or derives it
  straight from the artifact, and asks whether it satisfies the obligation — `valid = evaluate(actual,
  obligation)`. Its authority comes not from itself but from what the environment does with its verdict.
- **The gate supplies the consequence.** It decides whether the work may cross a boundary: commit, merge,
  deploy, close. A gate is a commitment; give an uncertain validator blocking authority and you convert
  its uncertainty into outages, so validation and gating stay separate decisions.

A costly goal earns several roles at once — a constraint to make the common wrong move unavailable, a
sensor and validator to catch the exotic one that slips past. What none of the four can reach stays a
human's job, named honestly rather than hidden.

## Why it's more than writing more tests

A test suite bundles three of the roles: it runs the code (a sensor), checks the result (a validator),
and fails the build (a gate). It is useful, but it works late and narrow. It runs after the wrong code
already exists, and it catches only what a case happens to exercise; the move no one thought to test
stays a live hazard. Adding more tests adds more sensing and judging — it never adds a constraint.

The thesis puts prevention first. A constraint works earlier and wider than any test: it makes the wrong
move unavailable, so the failing state is never built and no sensor is needed to catch it. "Constrain
first" is not "sense more." A suite that only observes leaves every unprevented move waiting for a case
that may never be written.

## Represented intent becomes authority — with or without a model

A model by itself has no authority. Alignment supplies it: once intent is explicit enough to check, the
environment enforces it. That does not make Alignment wait on Modeling. Where a property is already
legible in the artifact, authority can act directly — a constraint the compiler enforces needs no model
at all. Richer models simply widen the surface authority can reach, by making more properties explicit
enough to constrain, sense, validate, or gate.

## The mechanisms that instantiate it

- [Typed ViolationCategory / FailureCategory enums](product/repair-vocabulary/typed-categories.md)
- [The Audit-to-Lint mechanism](product/validation-and-conformance/semantic-lints.md)
- [ContentValidator](product/validation-and-conformance/content-validator.md)
- [F10 mutator-stamp-wiring lint](product/provenance-and-attribution/f10-wiring-lint.md)

A typed category makes an illegal value unrepresentable — a constraint. An audit promoted to a lint turns
a repeated human judgment into a repeatable one — a sensor and validator the commit runs. ContentValidator
re-derives whether the output still carries what the input asked for — a validator that does not trust the
generator's word. The stamp-wiring lint holds a whole class: every mutating verb must emit its provenance
stamp, checked where mutators are defined.

## Related concepts

- [Documentation, taken to its limit, is a structured model](concept-modeling-thesis.md)
- [Convert recurring failures into controls](concept-convert-failures.md)

## Read in the book →

[Read in the book →](book/3.3-constraints-sensors-validators-gates.html)
