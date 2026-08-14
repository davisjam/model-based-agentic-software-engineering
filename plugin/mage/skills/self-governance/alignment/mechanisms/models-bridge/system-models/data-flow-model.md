# Compliance data-flow model (typed sinks and edges for privacy reasoning)

**Intent** — Model where data of a governed kind can *flow* as a typed graph — the sinks that hold it, the
edges that move it between them — so a question like "where does a user's personal data land, and can we
erase all of it?" is answered by walking a declared model, not by grepping the codebase and trusting the
result. A data category with a sink the model doesn't know about, or an edge into a sink no erasure path
covers, is a build finding rather than a compliance gap discovered under audit (our instance: a typed
sink-and-edge registry over the personal-data flows, paired with erasure and information-flow policies an
evaluator checks against it).

| | |
|---|---|
| Summary | Typed sinks and edges for a governed data kind, so privacy and erasure are a model walk. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — the declared sinks and edges are reconciled against the real storage and transfer sites, and a policy evaluator checks properties (every sink erasable, no edge into an uncovered sink) over the graph |
| Derivation | `model-from-code` — the sink-and-edge graph is reconciled against the real storage and transfer sites |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

Privacy and erasure obligations are about *where data goes*, and that knowledge is scattered across every
module that writes a row, uploads a file, or forwards a payload to a third party. Asked "erase everything
we hold about this user," a team without a model answers by memory and search: someone lists the tables
they can think of, greps for the obvious writes, and misses the cache, the log sink, the analytics stream,
the vendor the data was forwarded to two releases ago. The miss is invisible — the erasure runs, reports
success, and leaves data behind in a sink nobody remembered. The same blindness hides an information-flow
violation: personal data reaching a sink it was never meant to touch, because no one enumerated the sinks
or the edges between them. The obligation is real and the substrate for reasoning about it is folklore.

## Why it's not just a list of tables

A list of the databases you store in is not the model, because the failures live in the parts a table list
omits: the caches, the queues, the log streams, the third-party transfers, and above all the **edges** —
which sink feeds which. The data-flow model is a *graph*, and its edges are what let an evaluator ask a
property no flat list can express: "is there any path by which category-X data reaches a sink with no
erasure coverage?" A list answers "what tables exist"; the graph answers "where can this data *end up*,
transitively." The model is also **typed by data category and sink kind**, so the same evaluator checks
several policies — erasability, permitted-flow, retention — over one graph rather than each being a
separate hand-audit. And because the graph is reconciled against the real write and transfer sites, a new
sink added in code without a model edge reddens the gate; a hand-kept list simply omits it and stays
quietly wrong.

## Mechanism

- **Enumerate the sinks as typed nodes.** Every place a governed data kind comes to rest — a table, a
  cache, a blob store, a log stream, a downstream vendor — is a declared node carrying its kind, not an
  implicit destination.
- **Declare the edges that move data.** Each transfer from one sink to another is an edge, so the model is
  a graph a walker can traverse, not a set of isolated stores.
- **Type nodes and edges by data category.** Personal data, derived data, and free-to-move data carry
  distinct types, so a policy can speak about one category's flows without dragging in the rest.
- **Run policies as an evaluator over the graph.** Erasability ("every sink holding personal data has a
  covering erasure path"), permitted-flow ("no edge carries category-X into a forbidden sink kind"), and
  retention are checks the evaluator computes by walking the model — one graph, several properties.
- **Reconcile the graph against the code.** The declared sinks and edges are checked against the real
  storage and transfer sites, so a store added without a model node, or a transfer without an edge, is a
  build finding, not a silent gap.

## Prerequisites

- **A governed data kind worth reasoning about.** The model earns its cost when a category of data carries
  an obligation (erasure, permitted-flow, retention); without one, a flow graph is architecture doodling.
- **Enumerable sinks and transfers.** The stores and the edges between them must be listable and
  reconcilable against code, or the graph is a hopeful diagram rather than a checked model.
- **A policy evaluator that walks the graph.** The value is the property check; a graph with no evaluator
  is a picture, and the properties stay hand-audited.

## Consequences & costs

- **Erasure and flow questions become model walks.** "Can we erase everything?" is answered by traversing
  declared edges to declared sinks, so a new sink forces the author to declare its node and its erasure
  coverage or fail the gate.
- **The graph must track reality to be trusted.** A sink the code writes but the model omits makes the
  evaluator confidently wrong; the reconciliation gate is what forces a new store into the model instead of
  leaving it uncovered.
- **Edges are the expensive part to keep honest.** Sinks are relatively easy to enumerate; the transfers
  between them — especially to third parties — are where the real graph hides, and where the model's value
  and its maintenance both concentrate.

## Known uses

- A typed sink-and-edge registry over an application's personal-data flows: databases, caches, blob
  stores, and third-party transfers as nodes, the movements between them as edges.
- Erasure and information-flow policies evaluated over the graph — "every personal-data sink is erasable,"
  "no edge carries personal data into an unpermitted sink kind" — as checks a walker computes, not
  hand-audits.
- The graph reconciled against the real write and transfer sites, so a store added without a model node is
  a build finding rather than an erasure gap found under audit.

## Related mechanisms

- **Sibling** — [component-zone-model](component-zone-model.md): both are typed maps of the system's
  structure; that one models *what code lives where*, this one models *where governed data flows*. Same
  modeling discipline, different subject.
- **Consumer** — [formal-invariant-verification](formal-invariant-verification.md): a flow property
  ("no path carries personal data into an uncovered sink") is the kind of predicate a checker proves over
  the declared graph, the same way it proves a lifecycle invariant.
- **Layer** — [drift-parity-gates](drift-parity-gates.md): the reconciliation that keeps the declared
  sinks and edges equal to the real storage and transfer sites.
- *See also* — [deployment-topology-model](deployment-topology-model.md): the physical placement of the
  sinks the flow graph names — where each store actually runs — the sibling physical-view model.
