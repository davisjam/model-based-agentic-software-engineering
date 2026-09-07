# The agent-first MBSE harness

**Intent** — Build the structured system-models as a **thin, hand-rolled harness over plain frozen
records**: adopt the *vocabulary and schema* of the right modeling genre per view, but skip its
runtime and hand-roll the executable layer. The model then captures your project's own invariants, and
a set of build-time checks keeps it equal to the code (our instance: frozen Python dataclasses under
five recurring disciplines, not a SysML tool).

| | |
|---|---|
| Summary | Structured frozen-record models + five hand-rolled disciplines; adopt the schema, skip the runtime. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) — the harness *is* construction (typed records); the counted sensors are the per-view drift lints that fail the build when a stored value or a model row diverges from the code |
| Governs | `all-models` — every structured model is built on this harness |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

You decide to model your system as [executable source-of-truth](executable-source-of-truth.md), and
the first instinct is to reach for a real modeling tool: SysML, Alloy, an EMF metamodel. Then two
failures land. **First, the tool's schema doesn't fit.** A real system-model carries project-specific
invariants (a verification tier derived from an invariant's temporal shape, a lock-ordering rule, a
zone-boundary predicate) that don't map onto any standard library's schema, so you spend more effort
fighting the tool's model than building yours. **Second, the tool draws or checks; it does not run
inside your own lints.** A SysML diagram is data a viewer renders; an Alloy model is data a solver
checks. Neither ships the discipline that makes the model *unable to lie about your code*: a build-time
check that loads the model, loads the code, and blocks on divergence. The failure is **a modeling
layer that either doesn't fit your invariants or doesn't wire into your build**, so it drifts, and a
drifted model is worse than none.

## Why it's not just a modeling language, or bare dataclasses

Two adjacent alternatives look like they would do the job. Neither does.

**Not a modeling language (SysML / Clafer / Alloy / AADL / EMF).** Such a model is **declarative data a
tool draws or a solver checks**, not code your own lints execute. Three things none of them ship:

- **The look-up seam.** None makes a model field *a projection of your code, reconciled at build time*.
  Their models are authored surfaces, not derived ones.
- **The drift discipline against your code.** A solver checks the model against *itself* (is it
  satisfiable?), never against the running codebase. The invention here is the build-time check that
  set-diffs model against reality and exits non-zero.
- **Your invariants.** The tool's schema is fixed; your project's invariants and derived fields are not
  in it. You would extend the tool anyway, at which point you are hand-rolling, minus the fit.

**Not bare Pydantic / dataclasses either.** Frozen dataclasses (or Pydantic records) give you *validated
typed records*: the raw material, not the method. This mechanism is the **five-discipline layer on top**:
the look-up seam, derive-and-assert, auto-discovery, the drift-lint, and the query projection. Typed
records get you a schema that validates its own shape, and a schema still drifts from the code it
describes, because nothing reconciles the two. The five disciplines add that reconciliation: they are
what turns a snapshot into a bridge that cannot lie about the code.

## Mechanism — five recurring harness disciplines

A fresh project re-instantiates these five. They are what makes the frozen records a *bridge* rather
than a snapshot:

1. **The look-up seam.** A model field is **loaded or derived from the code at build time**, never a
   hand-copied snapshot. If the authoritative states live in a code enum, the model reads that enum and
   projects it; it does not re-type the names. A hand-copied list is a second source of truth that
   desyncs the first time someone edits one side.
2. **Derive-don't-hand-type + assert-stored-equals-derived.** Any field that is a *function of other
   model data* (a verification tier derived from an invariant's shape, say) is computed by one
   derivation function, and a lint asserts the stored value equals the derivation. A hand-typed derived
   field is a lie waiting to happen: edit the inputs, the stored value goes stale, the model now asserts
   something false.
3. **The auto-discovery loader.** Drop a model file into the model directory and it self-registers: the
   loader discovers it, no central manifest to edit. Clone-and-run, zero ceremony.
4. **The drift-lint contract.** Per view, one stable check: load the model view, load the code the same
   way the model does, set-diff, re-run every derived field's derivation, exit non-zero on any
   divergence. This is the gate that makes the model **unable to lie**, the counted sensor of this
   mechanism.
5. **The generic query projection.** One introspection pass turns any structured-record model into JSON,
   giving the fleet a read-API over the model without a bespoke serializer per view.

## The default posture — hand-roll, and stay portable

**Default to hand-rolling.** Two reasons. Code is cheap now: a thin harness over frozen records is a
few hundred lines an agent writes without complaint. And a real system-model must capture
project-specific **invariants and properties that don't map cleanly onto any standard library's
schema**; forcing them into a tool's fixed metamodel costs more than it saves.

The discipline that keeps this from being reinvention: **adopt the vocabulary and schema of the
best-in-class genre per view** (the service-flow view speaks the Backstage service-catalogue entity
dialect; the deployment view speaks the topology vocabulary of the deploy manifest), then **extend and
hand-roll the rest.** Because you already speak the standard vocabulary, **porting onto a real modeling
tool later stays cheap** if you ever want the solver or the drawing: you translate a vocabulary you
already use, not a bespoke dialect you invented.

**The honest scope boundary: package the shared harness, keep the per-view drift lints hand-rolled.**
The look-up seam, the query projection, the auto-discovery loader factor into a shared library. The
drift lints genuinely differ: a component view set-diffs zones, a service view AST-reconciles handlers
against specs, a coverage view intersects test coverage with model nodes, a topology view subset-checks
the manifest. Forcing those four under one abstraction is over-engineering; leave each hand-rolled.

## If you want a real modeling tool

The default is hand-rolling for the reasons above, but these are the genres to **adopt vocabulary
from**, and the optional destinations if you later want a drawing or a solver. Each fits a different
view:

- **[SysML v2](https://www.omgsysml.org/):** general systems modeling; the vocabulary for a
  whole-system logical view.
- **[Clafer](https://www.clafer.org/):** feature/structure modeling with constraints; when the model is
  a configuration space.
- **[Alloy](https://alloytools.org/):** relational modeling with a bounded solver; when you want to
  *check* structural invariants, not just declare them.
- **[TLA+](https://lamport.azurewebsites.net/tla/tla.html):** temporal-logic specification with a model
  checker; the destination for the process/concurrency view's liveness and safety invariants.
- **[AADL](https://www.aadl.info/):** architecture & analysis for embedded/real-time systems; a rich
  physical-view vocabulary.
- **[EMF / Ecore](https://eclipse.dev/modeling/emf/):** a metamodeling framework when you want a
  first-class metamodel and generated editors.
- **[Backstage](https://backstage.io/):** the service-catalogue entity schema; the scenarios/service-flow
  view already adopts this dialect (schema adopted, runtime skipped).
- **[Structurizr / C4-as-code](https://c4model.com/):** architecture-as-code for the logical/component
  view, if you want rendered C4 diagrams from the same source.

**Author the views with the shipped scaffolds.** This catalogue's companion skill ships a
*system-models starter kit*, a fill-in scaffold set for the 4+1 architectural views (Kruchten): a
process-view **state-machine model** starter, a logical/development-view **component-zone model** starter,
a scenarios-view **service-flow model** starter (Backstage-dialect YAML + loader), and a physical-view
**deployment-topology** starter. Each scaffold is blank and portable, and each sketches the look-up seam,
the derive-and-assert rule, and the drift-lint `__main__` this mechanism names.

## Prerequisites

- **Frozen typed records that import nothing.** Data, not code, so any lint or tool reads them cheaply.
- **A code source to look up from** (an enum, a manifest, a handler tree) for the look-up seam to
  project.
- **A per-view drift lint wired into the build.** Without it, the "can't drift" claim is a hope.

## Consequences & costs

- **Five disciplines to hold per view.** The harness is thin, but each view must actually follow the
  look-up + derive + drift rules, or it degrades to a snapshot.
- **A drift lint per view to author.** They don't share code, by design; that is real surface.
- **Modelling discipline up front.** Deciding what to model, and in which genre's vocabulary, is design
  work (do it only where a failure lives, the scoping rule the starter kit leads with).

## Known uses

- A system-models directory of frozen dataclasses (state machines, component/zone catalogue,
  deployment topology) with an auto-discovery loader and a generic record→JSON query projection.
- A verification tier stored per invariant but **derived** from the invariant's temporal shape, with a
  lint asserting stored-equals-derived.
- The service-flow view authored in the Backstage entity dialect: schema adopted, runtime skipped.

## Related mechanisms

- **Enabler** — [executable source-of-truth](executable-source-of-truth.md): this is the *how* of
  building those models when you choose hand-rolled records over a modeling tool.
- **Counterpart** — [drift & parity gates](drift-parity-gates.md): the per-view drift lints this
  mechanism's fourth discipline names are exactly those gates.
- *See also* — [model-driven codegen](model-driven-codegen.md) (generate artifacts *from* the
  hand-rolled records) · [query surface](query-surface.md) (the agent-facing read API the generic query
  projection feeds).
