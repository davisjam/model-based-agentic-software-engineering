The **Bill of Materials / Dependency Model** reference page. The chapter *Modeling Structure and
Ownership* teaches this as the model that answers what third-party material the build depends on; the
full five-field treatment lands here.

**(a) Quality property.** **Manifest completeness** — a fresh checkout never breaks on a resolve the
author never saw fail. A dependency is a packaging fact, not a runtime one: it decides what the build
fetches before anything runs, so an undeclared package is a supply-chain surprise waiting for the next
clean environment.

**(b) Structure.** The dependency graph of a build.

- **`Package`** — one third-party dependency: its name, its pinned version, and whether it is a direct
  requirement or pulled in transitively.
- **The requires relation** — the edges of the graph, direct and transitive, the SBOM lens on the code.
- **The matching manifest** — the declared set the graph must equal: every package the code or a
  quality gate imports appears in it.

**(c) Representative figure.** A dependency graph fanning out from the build root to direct then
transitive packages, with the manifest as the boundary the gate holds the graph inside.


**(d) Invariants.**

<!-- table: Invariants of the bill of materials — each with the check that holds it. [short: Bill-of-materials invariants] -->
| Invariant | How it is checked |
|---|---|
| Every imported package appears in the matching manifest | Build-time completeness gate: an import absent from the manifest fails the build. |
| An out-of-band install lands in the same change that relies on it | The change that adds the dependency must add the manifest entry, or the gate fails the next build. |
| Pinned versions resolve in a fresh checkout | Resolve check against a clean environment. |

**(e) Derivation direction.** *From code, checked against an authored manifest.* The import graph is
read from the source (model-from-code); the manifest is the declared boundary the gate compares it
against. The bill of materials is not a document someone maintains — it is the manifest the gate holds
complete on every build. The join key is the package name.
