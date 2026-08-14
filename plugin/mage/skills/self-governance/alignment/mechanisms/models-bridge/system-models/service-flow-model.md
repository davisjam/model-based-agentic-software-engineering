# Service-flow / API model

**Intent** — A Backstage-dialect model of the service-oriented architecture — every service, its APIs,
inter-service auth, URL wiring, and frontend trees — that is the **source of truth** the deployment,
NetworkPolicy, and API docs are *generated from* and validated against.

| | |
|---|---|
| Summary | The SOA source-of-truth NetworkPolicy and wiring are generated from. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a structured model *held true* by bidirectional parity gates (tree↔yaml, handler↔spec, call-graph↔model) |
| Derivation | `both` — some fields generated to code, others reconciled from it |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

A service-oriented deployment has many moving parts that must agree: inter-service auth headers, URL env
vars, NetworkPolicy, the `SOA_SERVICES` deploy table, the public-API contract, the frontend trees. Kept
in sync *by hand* across code + YAML + deploy scripts, they drift — a service gains an endpoint the
NetworkPolicy doesn't allow, a handler diverges from its spec, a frontend tree exists with no entity.
Each drift is a production-shaped bug, and there are many surfaces to drift.

## Why it's not just "configure each piece where it's needed"

Per-piece configuration means the same fact (a service's auth, its URL, its APIs) is restated in code,
in deploy YAML, in NetworkPolicy — and restated facts diverge. The service-flow model is the **single
Backstage-dialect source of truth**: NetworkPolicy, service catalog, and env wiring are *generated from
it*, and **bidirectional drift gates** enforce it (every frontend tree ↔ a matching entity *and* every
entity ↔ a real tree; every handler ↔ its OpenAPI spec; the call-graph ↔ the declared model).
Hand-synced restatements are the failure: the same auth header lives in code, in deploy YAML, and in the
NetworkPolicy, and the day one moves the others keep the old value with no gate to notice. One generated,
parity-checked source leaves nothing to hand-sync and nowhere for the three copies to disagree.

## Mechanism

The service YAML uses the Backstage entity dialect (`kind: Component | API | System`) with
`<org>.dev/*` annotations for the SOA fields; a web-API model holds OpenAPI fragments; wire-contract and
config models capture the inter-service wire schemas and config. Generators emit NetworkPolicy, the
service catalog, env, and public-API docs *from* these (see [model-driven-codegen](model-driven-codegen.md)).
The drift lints enforce parity in both directions.

## Prerequisites

- **A service-architecture dialect** (here Backstage) expressive enough for the SOA fields.
- **Generators** that emit the real artifacts from the model.
- **Bidirectional parity gates** so neither the model nor reality can drift unilaterally.

## Consequences & costs

- **A new service/endpoint/tree ⇒ a model edit** or a parity-gate failure (deliberately).
- **Dialect lock-in.** Adopting Backstage's schema inherits its conventions (a deliberate
  "adopt the canonical schema" trade).
- **Generator + gate maintenance** across several surfaces.

## Known uses

- The Backstage-dialect service YAML — source of truth for inter-service auth, URLs, NetworkPolicy, and
  the SOA deploy table.
- The web-API (OpenAPI), wire-contract, and config schemas.
- Drift gates: the service-flow parity lint (tree↔yaml), the public-API drift lint (handler↔spec).

## Related mechanisms

- **Bridge** — agents *query* it ([query-surface](query-surface.md) `service-flow`/`web-api`) to reason
  about the SOA (agent side) ◀──▶ it *generates & governs* the deployed system — NetworkPolicy, wiring,
  API docs (product side). The clearest bridge: one model, both faces.
- **Enabler** — feeds [model-driven-codegen](model-driven-codegen.md).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the bidirectional parity lints.
