The **Service-Flow Model** reference page. The chapter *Modeling Structure and Ownership* teaches this
model through one engineering question, one figure, and one invariant; the full five-field treatment
lands here.

**(a) Quality property.** Three questions the scattered deploy config and handler code cannot answer
without a single model.

- **Wiring correctness** — *does every declared caller-to-callee edge have a real call site, and every
  real cross-service call a declared edge?* An undeclared call is an ungoverned one.
- **Access-policy parity** — *does the generated network access policy match the wiring the model
  declares?* The policy is emitted from the model, then diffed against the committed artifact, so what
  a service may reach stays equal to what the model says it may.
- **Contract parity** — *does each endpoint's declared request and response shape match the handler
  that serves it?* A drifted contract is a runtime failure the model turns into a build failure.

**(b) Structure.** A typed catalog in the dialect of a service-catalog schema, adopted for its
hard-won structure and read by the project's own tools.

- **`Service`** — one deployable unit: its name, its owning layer, and the endpoints it serves.
- **`Endpoint`** — one API surface on a service: its path, its auth requirement, and its declared
  request and response contract.
- **`Wire`** — one declared caller-to-callee edge, joining a calling service to a called endpoint.
  The set of wires is the graph the access policy is generated from and the call graph is checked
  against.

**(c) Representative figure.** A data-flow — the model on the left, the generators and parity gates it
feeds on the right.


**(d) Invariants.** The checkers are the trunk drift-and-parity machinery pointed at the service graph.

<!-- table: Invariants of the service-flow model — each with the check that holds it. [short: Service-flow model invariants] -->
| Invariant | How it is checked |
|---|---|
| Every declared wire has a real call site | Call-graph parity lint: each `Wire` edge must resolve to a real cross-service call. |
| Every real cross-service call is a declared wire | Same lint, reverse direction — an undeclared call is a finding. |
| The generated access policy matches the wiring | Freshness lint over the generated policy: regenerate from the model, diff against the committed artifact. |
| Each endpoint's contract matches its handler | Contract parity check joining the `Endpoint` shape to the handler signature. |

**(e) Derivation direction.** *Bidirectional.* The access policy and environment wiring are
model-to-code — generated from the declared model. The call-graph parity runs model-from-code — it
re-reads the real call sites and reconciles. The join key from a model row to the code is the endpoint
path, which indexes both a `Wire` edge and the handler that serves it.

*Also seen in:* Physical — the generated access policy is a placement artifact; referenced from the
behavior-and-execution chapter, rendered in full here.
