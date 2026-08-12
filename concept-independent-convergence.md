# Independent Convergence

**Claim** — Six industrial systems, engineered independently, land on one set of principles. None generalizes the whole theory, yet each instantiates a distinct arm — convergence, not derivation.

| Concept | Big idea 5 · the corroboration |
| --- | --- |
| Claim | Six industrial systems, engineered independently, land on one set of principles. None generalizes the whole theory, yet each instantiates a distinct arm — convergence, not derivation. |
| Mechanisms | Executable source-of-truth models · Pre-commit hook · Self-governance |
| Related | The Engineered Environment · Convert recurring failures into controls |
| In the book | book/6.5-mage-in-the-wild.html |

## The idea

<!-- fig: 0 -->

A theory built on one system invites a fair objection: maybe it only fits that system. The method here was
worked out on a single production codebase, studied deeply, over a long time. That depth is a strength and a
risk at once. It could mean the principles are real, or it could mean they are the idiosyncrasies of one
team dressed up as law.

The test is whether the theory travels. So the same constructs were checked against six industrial systems
engineered by people who never saw this method — Cloudflare, Docker, Shopify, Spotify, Siemens, and
Zenseact. Each solved its own governance problem for its own reasons. Read against the theory, they keep
landing on the same regions of it.

<!-- more -->

## Convergence, not derivation

Be exact about what the six show, because the strong claim would be false. No single system generalizes the
whole theory. Each leans hard on one arm and barely touches the others: Cloudflare on policy-first
governance, Spotify on fleet-scale verification, Siemens on models as the engineering surface. Read any one
alone and you would reconstruct a fragment.

The distinction earns the claim. The theory was not squeezed out of these six cases; it was built
elsewhere, and the six arrive at pieces of it on their own. Independent arrival at a shared destination
corroborates in a stronger way than a proof drawn from the very examples that inspired it — and MAGE's job
across the six is to name the fit, supply the vocabulary, and mark plainly what none of them reaches.

## What recurs across the six

Strip the six of their domains and the same three constructs show through. Each team, in its own words,
built structured models its agents reason through, mechanisms the environment enforces on every change, and
a habit of turning a failure it hit into durable structure so the failure would not return. The names
differ; the shapes do not.

That recurrence is the evidence: six groups, six starting points, the same primitives — a sign they answer
something real about governing autonomous work, not something local to one codebase.

## The mechanisms that instantiate it

- [Executable source-of-truth models](models-bridge/system-models/executable-source-of-truth.md)
- [Pre-commit hook](agent/gates-and-merge-train/pre-commit-hook.md)
- [Self-governance](agent/governance-doc-controls/self-governance.md)

Each construct that recurs across the six has a worked instance in this catalogue. A structured model the
fleet reasons through appears as the executable source of truth that fails the build when it drifts from the
code. An enforced mechanism appears as the commit-time gate that holds every change to standing rules.
Converting a failure into structure appears as the self-governance move that promotes a recurring lesson
into a control. The catalogue is one system's version of the primitives the other five reinvented.

## Related concepts

- [The Engineered Environment](concept-governance-centric.md)
- [Convert recurring failures into controls](concept-convert-failures.md)

## Read in the book →

[Read in the book →](book/6.5-mage-in-the-wild.html)
