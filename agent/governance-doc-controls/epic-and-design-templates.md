# Epic & design-doc templates

**Intent** — Fixed section-templates for the two core planning artifacts, **Epics**
(multi-dispatch efforts) and **design docs**, so every effort is framed with the same required sections
(scope, phase decomposition, second-order dynamics, definition-of-done, observability), and the planning
artifact *drives* the work instead of being written after the fact.

| | |
|---|---|
| Summary | Fixed section-templates for Epics and design docs so plans are complete. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `agent-output` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the template is soft guidance on the doc's shape, held by a hard counterpart: a stub scaffold materializes the sections and lints/gates assert the required ones (registration, DoD criteria, an observability block for topic-emitting designs). |

*Its place in the environment — a **variant / known-use** of **Validated Dispatch**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A planning artifact written free-form omits exactly the sections that matter. The design doc that skips
*second-order dynamics* ships a substrate that deadlocks at tick T+100; the Epic with no explicit
*Definition-of-Done* is "done" by assertion; the design that introduces an event-bus topic with no
*observability* section leaves the substrate unmonitorable. Without a template, each author frames
differently and the sections that prevent production incidents are the first to
be dropped under time pressure. The failure is *incomplete plans whose gaps resurface as incidents*.

## Why it's not just "write a good design doc"

"Write a good doc" leaves *which sections matter* to the author's memory, and the ones that matter
(scope conditions, phase decomposition, second-order dynamics, a DoD with functional invariants, an
observability/event-bus block) are precisely the ones a hurried author drops. A **template makes the
required sections structural**: the doc is not complete without them, a scaffold pre-places them, and a
lint can check for them. "Be thorough" is a norm nothing enforces; it fails the moment the author is
rushed. A section-contract holds regardless. It is the planning-artifact analogue of a typed schema, the
shape declared rather than remembered.

## Mechanism

An Epic template declares the mandatory sections (an N-section shape plus a multi-criterion §Definition-of-Done
covering functional invariants, docs, lints, tests, and a final trust-nothing review). Design docs carry
required blocks. For instance, any design that introduces an event-bus topic must include an
Observability/event-bus section, and any substrate with repetition or concurrency must include a
second-order-dynamics section. New Epics are **materialized from a stub tool** that atomically places the
sections + registers the effort in the ledger; registration and section-presence are then asserted by
lints/gates so the template is enforced, not merely documented.

**Adopt these — portable starters,** distilled from the real system: the
[Epic template starter](../../downloads/EPIC-TEMPLATE-starter.md) (the section shape + the
multi-criterion Definition-of-Done) and the
[design-doc template starter](../../downloads/design-doc-template-starter.md) (the invariants-driven
pattern: a section per real part, invariants with stable IDs, a second-order-dynamics block, an
observability block, and an invariants→tests enforcement map). Drop them into your repo and adapt.

## Prerequisites

- **A repeatable artifact genre worth standardizing.** Epics and design docs recur; a one-off memo does
  not need a template.
- **The set of required sections, identified from failure.** Each required section earns its place
  because omitting it caused an incident (a deadlock, a false "done," an unmonitorable substrate).
- **A scaffold + lints** so the template is materialized and checked; a template that is only *described*
  in docs decays to advisory prose.

## Consequences & costs

- **Soft·Hard has a hollow-section hole.** A presence check passes an empty "second-order dynamics"
  heading; the template forces the *section*, not genuine thought in it.
- **Maintenance surface.** A new required section means updating the template + the scaffold + the lint
  together; drift among them yields false rejections or silent gaps.
- **Over-templating adds ceremony.** Forcing the full Epic shape onto a trivial change is friction the
  author routes around; the template must be scoped to efforts that warrant it.

## Known uses

- The Epic template (mandatory section shape + the multi-criterion Definition-of-Done).
- The epic-stub scaffold that materializes an Epic dir + ledger registration, with registration gates.
- The design-doc rule that a new event-bus topic requires an observability/event-bus block.
- The rule that any substrate with repetition/concurrency carries a second-order-dynamics section.

## Related mechanisms

- **Counterpart** — the [Epic Definition-of-Done](epic-definition-of-done.md) is the *hard* gate that
  verifies, at close, that an Epic's template was actually satisfied (criteria met, pins re-run); the
  template is the soft shape up front, the DoD is the enforced check at the end.
- **Enabler** — the template makes *second-order-dynamics* and *observability* required sections, so it
  feeds the reason-about-dynamics and own-your-observability disciplines at design time rather than after
  an incident.
- *See also (family)* — [rule index](claude-md-rule-index.md) and
  [mandatory-snippet-table](mandatory-snippet-table.md): sibling governance documents whose completeness
  is enforced by a hard counterpart.
