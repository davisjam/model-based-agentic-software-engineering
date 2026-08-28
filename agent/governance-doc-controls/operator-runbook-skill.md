# Operator runbook skill (positive map first, symptom index fallback)

**Intent** — A loadable skill that gives an operating agent the *positive* map of how the operational
substrate works (its lifecycles and healthy baselines) **first**, and a *symptom → resolving-doc*
catalog as the fallback when something breaks. Generate its content from a typed source-of-truth so a
reference-validity lint (not tests; it executes nothing) keeps every pointer honest, and type each
recovery step by how automatable it is (our instance: an `operate-ada-tool-repo` skill over the
agent-fleet substrate, rendered from two typed YAML sources: a pointer catalog and a runbook catalog).

| | |
|---|---|
| Summary | Positive substrate map + symptom→doc routing, generated from typed YAML, ref-lint-checked. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `agent-output` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the skill *routes*, it cannot execute or block; its correctness is a hard reference-validity lint that resolves every pointer's file *and* heading anchor against disk (a non-executable index earns trust from a ref-check, not tests) |

*Its place in the environment — a **variant / known-use** of **Encoded Operational Judgment**, under **GOVERN · Govern the control machinery itself**. Preserved here for its technical texture; the [construction kit](../../constructing-the-gee.md#cap-govern) shows how it folds.*

## Motivation — the failure it kills

An operator (a human or an orchestrator agent) running a complex substrate must know two things: how it
*works* when healthy, and what to do when it *breaks*. Both live scattered across a house-rules doc, a
docs index, and incident memories that a fresh or post-compaction operator does not reliably hold. So the
operator **re-derives the substrate's shape from scratch** under load, and during an incident re-derives,
badly and under time pressure, a recovery a doc already spells out. And the routing itself **rots**: a doc
moves, the pointer dangles, the next operator is sent on a chase. The failure is *re-derivation of known
operations* plus *silent pointer rot*, and it recurs every session and every incident.

Underneath is a stance: **the fleet is cattle, not pets.** You operate an agent fleet with *repeatable
runbooks*, not by re-reasoning each incident from scratch or *chatting* the orchestrator toward a goal.
That is the pet stance ("sysadmin-ing a pet server"), and it is a category error at fleet scale. This
mechanism is the cattle stance made concrete for repo operations: a routed, lint-kept index of typed
operations, so an operator runs the herd instead of nursing it.

## Why it's not just "a folder of runbooks" (or the docs index)

A runbook collection answers "what do I do when X breaks," but only the *failure* half, and only if you
already know which runbook. A docs index answers "what docs exist": *doc-keyed*, not operator-keyed.
This skill does three things neither does. It **leads with the positive map** (the substrate's lifecycles
and healthy baselines) so the operator knows *normal* before hunting a break (most of the time the system
is healthy, and you cannot spot a fault without the baseline). It is **symptom-keyed**: you start from
what you *observe*, not the doc you'd have to already know. And it is **generated from a typed
source-of-truth**, so a **reference-validity lint** resolves every pointer's file *and* heading anchor on
every build, making a moved doc or renamed section a build error, not a dangling chase. The distinction is
*an operator-keyed, positive-first, lint-kept map* versus *a doc-keyed pile you must already know your way
around*.

## Mechanism

The skill has two halves: a **portable stance** (how to operate, how to RCA observability-first, the
standing freedom to propose governance improvements) and a **project-specific catalog generated from
typed YAML** (the positive lifecycle map, the symptom→doc rows, and the runbooks). Each runbook decomposes
into **typed step-kinds** — *runnable* (a command), *carried-brief* (a dispatchable judgment step),
*surface-to-user* (needs a human decision) — so the judgment-automatable middle is a first-class, lintable
resource rather than under-specified prose. Two mechanisms keep it honest. The **reference-validity lint**
resolves every pointer's file and anchor. And the skill **partners with a failure-interpretation skill**:
after a failure recurs, it routes to *classify the class → register an Epic → design the mechanism*, never a
DIY inline fix (designing a mechanism is architecture and earns a design pass). Part of that design is choosing the
mechanism's **placement by semantic level** — see
[semantic-level-enforcement](semantic-level-enforcement.md) for the general move — so the check lands at the
scope where its property is legible, not the cheapest hook.

## Prerequisites

- **A typed source-of-truth** the skill renders from; hand-authored markdown drifts from the docs it
  points at, while the YAML is single-sourced and lint-checkable.
- **A reference-validity lint that resolves file *and* anchor.** File-exists alone lets a renamed section
  dangle.
- **Typed step-kinds** on runbook steps, so "which of these is runnable vs needs judgment" is declared,
  not guessed by the operator mid-incident.
- **A partner failure-interpretation path**, so a recurring failure becomes a *designed* mechanism rather
  than an inline patch.

## Consequences & costs

- **The skill is soft.** It routes an operator to the right doc; it cannot execute or block. Its value is
  being loaded and heeded.
- **Coverage is soft; validity is the hard half.** The lint guarantees every *listed* pointer resolves; it
  cannot guarantee every *real* symptom is listed. Completeness rots unless new incidents are appended
  (the second-time-not-the-third discipline).
- **Anchor-resolution is a maintenance tax.** Resolving heading anchors (not only files) catches more rot
  but fires on every heading rename; that is the price of the higher fidelity.
- **Generation adds a build step.** The YAML→markdown render must run, or the served skill drifts from its
  source.

## Known uses

- A skill leading with the substrate's lifecycles + healthy baselines, then a symptom→resolving-doc
  catalog for breaks.
- Runbooks with typed step-kinds (runnable / carried-brief / surface-to-user), making the
  judgment-automatable middle a lintable resource.
- **A drift-audit runbook that reads a structured model to know what changed** — the sharpest case of the step
  typing. Given a structured model and the code it claims, its *runnable* steps mechanize the determinizable
  work (enumerate every claim-to-code anchor, resolve each symbol to flag a broken one, batch-re-run the
  model's own owned checks for any gone red since the work closed) and its *surface-to-user* step reserves
  the one question a machine can't take: is a mismatch a real divergence, or an intended as-built gap the
  model should record rather than treat as an error? The judgment residual shrinks by one for a
  formally-anchored claim, where re-running its checker *is* the semantic verdict — so that slice's
  irreducible step becomes runnable. This is a runbook whose mechanizable steps are driven off the model
  the definition-of-done reads to learn what drifted (its instance: a DoD drift-audit over the system
  models, minted from an audit that harvested roughly two dozen drift instances at near-one
  signal-to-noise across recently-closed work).
- The reference-validity lint resolving every pointer's file and heading anchor from a typed YAML
  source-of-truth.
- The handoff to a failure-interpretation skill: recurring failure → classify → Epic → designed mechanism.

## Related mechanisms

- **Counterpart** — [operational-playbooks](operational-playbooks.md): those are the situation-keyed
  runbooks themselves (the failure half); this skill is the operator-keyed *map over* them:
  positive-lifecycle-first, symptom-indexed, lint-kept. The named axis is *the runbooks* versus *the
  indexed, generated map into them*.
- **See also** — [claude-md-rule-index](claude-md-rule-index.md): both treat a governance *document* as
  enforced infrastructure held honest by a lint; this one adds the operator-index shape and generation
  from a typed source.
- **Enabler** — the reference-validity lint is the same "every pointer ↔ a real target" discipline as the
  models' [drift-parity gates](../../models-bridge/system-models/drift-parity-gates.md), applied to a
  doc-skill instead of a structured model.
