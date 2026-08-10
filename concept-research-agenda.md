# The Research Agenda

**Claim** — Three open frontiers: how far judgment can migrate into deterministic machinery, how to census a governed environment's coverage and gaps, and what stronger models unlock.

| Concept | Big idea 6 · the frontier |
| --- | --- |
| Claim | Three open frontiers: how far judgment can migrate into deterministic machinery, how to census a governed environment's coverage and gaps, and what stronger models unlock. |
| Mechanisms | Control-coverage census · Governance graph · Formal invariant verification |
| Related | Convert recurring failures into controls · Documentation, taken to its limit, is a structured model |
| In the book | book/6.7-open-problems.html |

## The idea

<!-- fig: 0 -->

A theory earns its keep by the questions it opens, not the ones it closes. This one closes the argument that
the engineer's object of work is now the environment. It opens a research program about how far that
environment can be pushed, how you would know, and what the next tier of models changes. Three frontiers
carry the open work.

<!-- more -->

## The determinization frontier

Every obligation an agent must honor sits somewhere on a ladder from soft to hard. At the soft end a prompt
or a convention aims the agent and hopes. Climb the ladder and the same obligation becomes a skill, then a
rule, then a lint that blocks the commit, then an invariant a model checks, then a property a simulation
exercises. Each rung trades flexibility for a guarantee the agent cannot talk past.

The open question is how far any given obligation can climb. Some reach proof; some stall at a lint because
their meaning resists formalizing; some stay human judgment because nothing mechanical yet captures them.
Where each obligation can settle, and what it costs to move it one rung, is empirical — a frontier to
measure against real systems rather than a line to assert.

## The governance census

<!-- fig: 1 -->

An environment that governs by mechanism can be counted. List the obligations it must meet and the
mechanisms it actually runs, then match one against the other. Three numbers fall out: obligations met by a
mechanism, obligations with no mechanism, and mechanisms guarding nothing anymore. Coverage, under-governance,
and governance debt stop being opinions and become counts.

Once governance is a census, a governed environment can be audited the way a build is checked. You can ask
which failure classes are covered, which are exposed, and where accumulated apparatus has outlived its
purpose. The frontier here is method: what to count, how to keep the count honest as the system moves, and
what a healthy coverage profile even looks like.

## What stronger models unlock

The third frontier is a moving one. Each new tier of model capability lets the environment stop enforcing by
hand some things it used to police, and lets it attempt guarantees that were out of reach. A control that
was worth its cost against a weaker fleet may become dead weight against a stronger one, and a guarantee that
was infeasible may come within reach.

So the agenda is not a fixed list. It is a regime — a way of asking, at each capability step, which
obligations migrate up the ladder, which controls retire, and what the census now shows. The book opens that
regime rather than settling it.

## The mechanisms that instantiate it

- [Control-coverage census](models-bridge/system-models/control-coverage-census.md)
- [Governance graph](models-bridge/system-models/governance-graph.md)
- [Formal invariant verification](models-bridge/system-models/formal-invariant-verification.md)

The frontiers are not only future work; the catalogue already reaches toward them. A coverage census bins
the controls by what they guard and surfaces the targets left uncovered. A governance graph makes the
obligation-to-mechanism match a queryable structure rather than a spreadsheet. And formal invariant
verification is the far end of the determinization ladder, where an obligation becomes a property a checker
proves. Each is a first step onto a frontier the book marks as still open.

## Related concepts

- [Convert recurring failures into controls](concept-convert-failures.md)
- [Documentation, taken to its limit, is a structured model](concept-modeling-thesis.md)

## Read in the book →

[Read in the book →](book/6.7-open-problems.html)
