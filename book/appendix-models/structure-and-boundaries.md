Structural models represent what exists and how elements relate. In review, they expose which
architectural boundaries a change affects. Ownership and boundary policy often share the same representation
but answer distinct questions: who owns a surface, and which relationships are permitted.

## Component and Zone

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

[ref:fig-g2-structure-boundaries] joins the authored catalog to the observed tree.

<!-- label: fig-g2-structure-boundaries -->
<!-- figure: assets/appendix-g-2-structure-boundaries.svg | *Structure and boundaries.* Authored ownership and permitted seams are reconciled with the observed repository tree. Sanctioned crossings pass through declared doors; forbidden direct access raises a finding. -->

**Property.** Representative properties, each with the source that decides it:

<!-- table: Representative properties of the component-and-zone model, and the fact source each draws on. [short: Component-zone properties] -->
| Property | Fact source |
|---|---|
| Every in-scope source directory belongs to exactly one component | Authored ownership joined to the observed tree |
| Every component's declared directory exists | Repository |
| Boundary crossings use sanctioned seams | Authored model |
| Powerful mutation surfaces are reachable only through declared doors | Authored model plus observed dependency |

Directory existence can be derived from the repository; ownership and permitted boundaries are
authored architectural decisions.

**Authority and correspondence.** The repository tree is mapped back to the component catalog. A
directory with no owner, multiple owners, or an observed dependency crossing an undeclared boundary
becomes a correspondence finding. Where reconciliation depends on source locations, anchor references
to resolvable symbols rather than line numbers so the correspondence can be re-derived after edits.
The finding may remain advisory or feed a lint, build failure, or admission gate.

## Service Flow

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

The central object is the declared edge. Each permitted service-to-service or service-to-resource
relation records both reachability and its authentication posture; an observed edge with no
declaration is a mismatch.

**Property.** Only declared service-to-service and service-to-resource relationships are permitted,
each with its declared authentication posture. The same graph carries both connectivity and access policy.

**Authority and correspondence.** The declared graph supplies the *ought*. Static call sites,
generated configuration, deployment wiring, and runtime observation each supply part of the *is*. A
correspondence check asks whether each observed edge is declared and, where it
matters, whether each declared edge still exists.

The same representation pattern applies to firewall policy, service-mesh authorization, network
policy, and cloud access control: the representation declares permitted relations while the
enforcement mechanism varies by substrate.

## Two Simpler Structural Forms

Two simpler forms use the same pattern: reconcile observed facts or edges against a declared set.

- **Domain registry.** A registry stores a slowly changing fact under one stable key. Consumers
  query or join through that key rather than maintaining independent copies.
- **Bill of materials.** A bill of materials records the third-party dependencies present in a build.
  Where an authored dependency set exists, completeness can be checked by reconciling the observed
  dependency edges against it.
