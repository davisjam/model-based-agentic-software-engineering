Structural models answer what exists, who owns it, and which relationships are permitted. In
review, they are the surface a reviewer projects a change onto to ask *which architectural boundary
moved?* Two representations carry most of the teaching load in Part II: the component-and-zone model
and the service-flow model. Domain registries and bills of materials apply the same principle in a
simpler form, treated briefly at the end.

## Component and zone

**Engineering question.** Where am I, who owns this surface, and what may cross its boundary?

The model maps implementation surfaces to components and declares the seams through which those
components may interact.

**Representation.** A minimal form:

```
Component
    id
    name
    focus_directories[]
    tags[]
    boundary_kind
Zone
    component_id
    directory
Seam
    source_component
    target_surface
    relation_kind
    permitted
```

The production representation may carry more metadata. The reusable idea does not require it.

[ref:fig-g2-structure-boundaries] joins the authored catalog to the observed tree.

<!-- label: fig-g2-structure-boundaries -->
<!-- figure: assets/appendix-g-2-structure-boundaries.svg | *Structure and boundaries.* Authored ownership and permitted seams (solid) join to the observed repository tree (dashed reverse-map). The model answers a descriptive question — what directory exists? — and a normative one — which component should own it, and which boundary may it cross? A sanctioned seam runs through the declared door; a forbidden direct reach to the raw format library is marked as a crossing the model rejects. -->

**Property.** Representative properties, each with the source that decides it:

<!-- table: Representative properties of the component-and-zone model, and where each draws its authority. [short: Component-zone properties] -->
| Property | Source of authority |
|---|---|
| Every in-scope source directory belongs to exactly one component | Authored ownership joined to the observed tree |
| Every component's declared directory exists | Repository |
| Boundary crossings use sanctioned seams | Authored model |
| Powerful mutation surfaces are reachable only through declared doors | Authored model plus observed dependency |

The split between authored and derived facts is essential here. Directory existence can be
rediscovered from the repository. Ownership cannot. Someone has to decide what the architecture
ought to be.

**Authority and correspondence.** The repository reverse-maps into the component catalog. A
directory with no owner, two owners, or an observed dependency that crosses an undeclared boundary
becomes a correspondence finding. When the derived side of that reconciliation is anchored on a
resolvable symbol — a real identifier a lint can re-locate rather than a line number — the
correspondence cannot rot into a stale reference; symbol-anchored traceability is the reusable form
of that discipline. Part III decides what authority attaches to the finding: report, lint, build
failure, or admission gate.

## Service flow

**Engineering question.** Which service may call or reach which service or resource, and under what
policy?

**Representation.**

```
Service
    id
    role
Resource
    id
    kind
Flow
    source
    target
    relation
    auth_posture
```

The important object is the declared edge. Service A reaches service B and resource X along
declared, authenticated edges; a reach to resource Y that no edge declares is exactly what the
model surfaces.

**Property.** Only declared service-to-service and service-to-resource relationships are legal, each
with its declared authentication posture. The graph is at once structural and decisional: it
describes connectivity, and its permitted edges encode who may do what.

**Authority and correspondence.** The declared graph supplies the *ought*. Static call sites,
generated configuration, deployment wiring, and runtime observation each supply part of the *is*. A
correspondence check asks whether observed edges belong to the declared relation, and, where it
matters, whether declared edges still exist.

The same pattern appears in firewall policy, service-mesh authorization, network policy, and cloud
access control. The enforcement rung differs; the representation stays a declaration of permitted
relations. Part II makes that generalization directly.

## Two simpler structural forms

Two further Part II examples need no standalone reference. Both are the structural family in
miniature: reconcile observed edges against a declared set.

- **Domain registry.** A registry centralizes a slowly changing fact consumed in many places, keyed
  once. Every consumer joins through the canonical key; no consumer keeps a private copy. The model
  prevents disagreement by removing duplicated authority.
- **Bill of materials.** A bill of materials represents the third-party material a build depends on.
  Every package imported by production code or a quality gate appears in the corresponding
  dependency manifest. The useful property is structural completeness: observed dependency edges
  reconciled against a declared set.

These illustrate the structural family. They are not additional boxes MAGE asks you to fill.
