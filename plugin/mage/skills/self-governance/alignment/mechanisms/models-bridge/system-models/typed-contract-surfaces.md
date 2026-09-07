# Typed contract surfaces (the contract is a checked model, not a comment)

**Intent** — Turn the contract between two parties — an HTTP API and its clients, two languages sharing
a wire format, a command-line tool and the scripts that parse its output — into a **structured, checked
model** instead of a shared assumption. The producer's shape and the consumer's expectation both
reconcile against one declared surface, so a breaking change reddens a build gate rather than silently
breaking the far side at runtime (our instance: a structured endpoint model with visibility and auth
extensions, a cross-language marker-and-JSON schema registry, and a per-subcommand stdout spec used as a
fuzz oracle).

| | |
|---|---|
| Summary | The contract between two parties is a structured, checked model, not a shared assumption. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — each contract is a typed surface reconciled against its real producer and consumer; a handler whose shape diverges from the declared endpoint, or output that violates the declared spec, is a build finding |
| Derivation | `model-from-code` — the contract surface is reconciled against the live producer and consumer sites |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A contract crossing a boundary usually lives as a comment, an example payload, or nothing at all. One
side changes its shape; the other keeps parsing the old one; the mismatch surfaces as a runtime error at
the far end, far from the edit that caused it. The three classic boundaries all rot the same way. An HTTP
endpoint drops a field and a client deserializes `null`. A worker in one language emits a status marker
that a coordinator in another language greps for, and a rename on one side leaves the other matching a
string that no longer appears. A command-line tool changes its stdout JSON and every script that piped it
breaks at once. In each case the two sides share a shape that is written down **nowhere a check can
read**, so nothing catches the divergence until production does.

## Why it's not just a schema file

A schema file on its own is a document, and it drifts like any document. The contract surface earns the
word *model* by being **reconciled against both sides at build time**: the producer's real output shape
and the consumer's real expectation are both checked against the one declared surface, so neither can move
without the gate noticing. A plain schema you hand-write and hope stays accurate has no such tie — it goes
stale the moment a handler changes, and its staleness is invisible until a client hits the gap. The
surface also **carries more than field names**: which endpoints are public, what auth each demands, which
stable output points a fuzzer may treat as an oracle. That extra typed metadata is exactly what a comment
or a loose JSON example cannot hold and a checker cannot read. The distinction is the same one this
catalogue draws everywhere: a schema that can lie is a document; a schema a drift gate keeps honest is a
model.

## Mechanism

- **Declare the boundary shape as a typed surface.** The endpoint set, the cross-language marker and JSON
  schemas, the per-subcommand output spec — each an authored object the build reads, not a prose contract
  two sides remember differently.
- **Reconcile the producer against it.** The handler that serves an endpoint, the writer that emits a
  marker, the subcommand that prints the JSON — each is checked to match its declared shape, so the
  producer cannot drift from the contract unnoticed.
- **Reconcile the consumer against it.** The client, the coordinator that parses the marker, the script or
  test that reads the output — each expects the declared shape, so a change the producer makes surfaces as
  a mismatch on the consumer's side of the same gate.
- **Carry the boundary's policy, not just its fields.** Visibility, auth, billing, and which output points
  are stable fuzz oracles ride on the surface as typed metadata, so a check can ask "is this endpoint
  meant to be public?" or "is this output point a spec commitment?" and get an answer.
- **Treat a stable output point as a spec commitment.** A declared CLI-output shape becomes the oracle a
  fuzzer checks against, so an adversarial input that breaks the contract fails to the *stable spec point*,
  not to one producer's incidental formatting.

## Prerequisites

- **Two identifiable sides to reconcile.** The value is checking a producer and a consumer against one
  surface; a contract with only one side to check is just that side's own type.
- **A build-time gate that reads the surface.** Without a check that reconciles real handlers and real
  consumers against the declaration, the surface is a schema document that drifts.
- **A stable notion of "the contract," distinct from any one implementation.** The endpoint's shape must
  be nameable independent of the handler that serves it, or there is nothing for both sides to point at.

## Consequences & costs

- **A breaking change becomes a build finding, not a production incident.** Moving a field, renaming a
  marker, or reshaping output now reddens the gate at the edit, which is friction exactly where the cost of
  silence was highest.
- **The surface is one more thing to keep true.** A contract model that stops matching its producer gives
  false confidence, so the reconciliation gate is load-bearing — a surface no check reconciles is worse
  than no surface, because it looks authoritative.
- **Three boundaries, one genre, but distinct instances.** An API model, a wire schema, and a CLI-output
  spec share the pattern yet differ in what "the far side" is; folding them into a single artifact would
  blur checks that want to run at different times against different consumers.

## Known uses

- A structured endpoint model carrying per-endpoint visibility, auth, and billing, reconciled against the
  request handlers that serve it.
- A cross-language wire-contract registry: the status markers and JSON shapes a worker in one language
  emits and a coordinator in another consumes, checked against both emit and parse sites.
- A per-subcommand CLI-output spec that doubles as a fuzz oracle — the stable stdout shape an adversarial
  input is checked against, so a fuzz failure lands on the declared spec point rather than on one run's
  formatting.

## Related mechanisms

- **Sibling** — [service-flow-model](service-flow-model.md): the inter-service wiring model names *which*
  services call which; this genre types the *shape* of what crosses each call. One says who talks to whom,
  the other says in what language.
- **Layer** — [drift-parity-gates](drift-parity-gates.md): the reconciliation machinery that keeps each
  contract surface equal to its real producer and consumer, the same parity every model here rides on.
- **Consumer** — [fuzz-campaigns](https://davisjam.github.io/model-based-agentic-software-engineering/product/regression-tests/fuzz-campaigns.html): the CLI-output contract is the stable oracle a fuzz
  campaign checks generated output against, so an adversarial input fails to the declared spec point.
- **Counterpart** — [meta-model-consumption](meta-model-consumption.md): consumers should *read* the
  contract surface rather than hardcode a snapshot of it, the read-side discipline that keeps a contract's
  two ends pointed at the same declaration.
- *See also* — [semantic-level-enforcement](../../agent/governance-doc-controls/semantic-level-enforcement.md): a contract check belongs at
  the boundary's own semantic level — the endpoint shape, the marker schema — not as a raw string match a
  layer below.
