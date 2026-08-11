The **Component & Zone Model** reference page. The chapter *Modeling Structure and Ownership* teaches
this model through one engineering question, one figure, and one invariant — and uses it to teach the
descriptive-vs-intent-bearing distinction; the full five-field treatment lands here.

**(a) Quality property.** Two, both drifting silently the moment a directory moves.

- **Ownership correctness** — *which component owns this file, and does that answer match the real
  directory tree?* A reverse-mapping test reconciles the declared zones against the tree in both
  directions, so a moved directory fails the test instead of quietly staling every tool's private
  inference.
- **Boundary soundness** — *may this component's zone reach that seam?* The declared boundary kind and
  sanctioned seams make an out-of-bounds reach a lint finding, not a slow erosion.

**(b) Structure.** A typed registry keyed by component.

- **`Component`** — one unit of ownership: its focus directories, its tags, its boundary kind
  (internal, a trust edge, an external seam), and its declared read surfaces.
- **The zone relation** — each `Component` claims a set of directories; their union must partition a
  **declared source surface** (the repository tree minus the paths that belong to no component: root
  config, top-level docs, generated output, vendored trees). The reverse-mapping test asserts the
  match both ways over that surface, so a moved or unowned *in-scope* directory is a finding while a
  vendored tree is not.
- **The seam relation** — each boundary component declares the external seams it may cross, so a reach
  outside the declared set is a finding.

**(c) Representative figure.** A component flow — the registry feeding the tools that read it, with a
reverse-mapping test joining registry to real tree.


**(d) Invariants.** A reverse-mapping test and boundary lints.

<!-- table: Invariants of the component & zone model — each with the check that holds it. [short: Component-zone model invariants] -->
| Invariant | How it is checked |
|---|---|
| Every declared zone matches a real directory | Reverse-mapping test, model ⊆ reality — a declared zone with no directory is a finding. |
| Every in-scope source directory is owned by exactly one component | Reverse-mapping test, reality ⊆ model, over the declared source surface — an unowned or double-owned in-scope directory is a finding; declared out-of-scope paths are exempt. |
| No component reaches a seam its boundary kind forbids | Boundary lint over the declared seam set. |

**(e) Derivation direction.** *Split by field* — the model's clearest illustration of descriptive vs
intent-bearing facts. The reverse-mapping test re-reads the real directory tree, so the tree is ground
truth for a zone's **existence** and the tree's **coverage** — but not for a component's *intent*. Who
owns a directory, what boundary kind a component is, and which seams it may cross are **authored**: the
model records them and the boundary lint defends them; the code cannot derive them.

<!-- table: Field-by-field authority for the component & zone model. [short: Component-zone field authority] -->
| Field | Authority | How it is held |
|---|---|---|
| Zone existence — does each declared focus-dir exist? | **from code** (descriptive) | Reverse-mapping test, model ⊆ reality |
| Tree coverage — is every in-scope directory owned once? | **from code** (descriptive) | Reverse-mapping test, reality ⊆ model |
| Ownership assignment — *which* component owns a directory | **authored** (intent-bearing) | Declared; the test checks consistency, not that the choice is right |
| Boundary kind — internal / trust-edge / external seam | **authored** (intent-bearing) | Declared per component |
| Sanctioned seams — which seams a boundary may cross | **authored** (intent-bearing) | Declared set; the boundary lint holds every reach inside it |

The join key is the focus directory: a reader round-trips from a `Component` record to the files it
owns by that path prefix, and dispatch, lints, and context injection all resolve ownership through the
same key.

*Also seen in:* Logical — a component is a functional-structure unit; rendered in full here.
