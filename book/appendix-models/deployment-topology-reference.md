The typed statement of where things run — each service's name, its layer, and its tier — from which the
deploy scripts and layering lints reason about a declared topology rather than scattered constants, and
against which the real deploy table is reconciled. The Part-II mainline shows the parity invariant; the full
treatment is here.

**(a) Quality property.** **Deployment parity** — *does every service the model declares deploy at the tier
the model says, and does every deployed service appear in the model?* A tier that drifts in the code without a
matching model edit fails the build instead of surfacing as a production surprise. The same record also
carries the layer-boundary graph the structural chapter checks — *may this layer import that one?* — so a
cross-layer shortcut is a finding there.

**(b) Structure.** A frozen record per service, keyed by name.

- **`Service`** — one deployable unit: its name, its owning layer (web, worker, shared), and its tier class
  (critical, batch).
- **The tier relation** — each `Service` declares the tier it must deploy at; the set of declared tiers is
  what the deploy table is checked against.
- **The layer relation** — the layers form the dependency graph a cross-layer-import lint reads, and the same
  topology is the ground truth the migration blast-radius query joins against.

**(c) Representative figure.** A deployment diagram — the build host that produces the image, and the runtime
cluster it deploys into; each service a frozen record keyed by name, carrying its owning layer and tier class.
(Reuse `assets/deployment-model-structure.svg`.)

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| Every declared service deploys at the tier the model declares | *□P* (safety) | Parity lint, model ⊆ reality: a declared service missing from the deploy table, or at the wrong tier, is a finding. |
| Every deployed service appears in the model | *□P* (safety) | Parity lint, reality ⊆ model: a service in the deploy table the model never declared is a finding. |
| No import crosses a forbidden layer boundary | *□P* (safety) | Cross-layer-import lint reads the layer graph; an import across a forbidden edge is a finding. (Rendered under the structural chapter.) |

The parity check is a set-diff run both directions against the live service-to-tier map. Neither direction is
optional: model ⊆ reality alone misses a service that shipped without a model row; reality ⊆ model alone
misses a tier that drifted in the code.

**(e) Derivation direction.** *Model-from-code* for tier placement. The parity check re-reads the real deploy
table — the declared service-to-tier configuration the build consumes — and reconciles the model against it.
Ground truth for placement is the **deploy configuration**, and the property established is
**deployment-configuration parity**: the model agrees with what the build is configured to deploy. Whether
each process then *runs* at the tier its configuration names — **runtime-deployment conformance** — is a
stronger, runtime check this model does not perform. The join key is the service name, which indexes both the
`Service` record and its deploy-table row. The model is authoritative for the layer graph (the import lint
reads it directly) and reconciled against the deploy configuration for tier placement.

*Also seen in:* the structural chapter — a layer boundary is a packaging fact.
