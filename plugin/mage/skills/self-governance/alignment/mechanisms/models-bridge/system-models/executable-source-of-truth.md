# Executable source-of-truth models

**Intent** — Model the system as **typed data that tools read on every run and generate real artifacts
from**. The model becomes *executable documentation that cannot drift*, and the codebase becomes
operable by a context-bounded agent.

| | |
|---|---|
| Summary | Structured models read every run and generated from; can't drift. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) — the models are *construction* (typed IR); the counted sensors are the [drift/parity gates](drift-parity-gates.md) that fail the build when a model diverges from reality |
| Governs | `all-models` — every model is the typed data this reads on every run |

> **★ The bridge.** This is the flagship of the third role: the model layer is the **interface through
> which a context-bounded agent operates a context-exceeding codebase.** It faces both ways. Agents
> read it to reason; the codebase is governed from it, and a limited slice (config, docs, IPC contracts) is generated from it too. The other bridge entries are its
> models and mechanisms.

*Its place in the environment — the **canonical mechanism** for **KNOW · Maintain authoritative system knowledge**.*

## Motivation — the failure it kills

A large codebase **exceeds any agent's context window**; no agent can hold 280 KLOC. Left to read the
raw code, an agent gets lost, re-derives the architecture (badly), and drifts. Meanwhile the
architecture itself lives only implicitly, scattered across the code, so *humans* re-derive it too. The
failure is *no shared, authoritative, compact representation of the system*, which caps how large a
codebase agents can operate on at all.

## Why it's not just "write architecture docs"

Prose architecture docs **drift**, because nothing forces them true. They are read by humans
occasionally and validated never. These models are **executable**: they are *data that tools, lints,
and deploy scripts read on every run*, and that *generate* real artifacts (NetworkPolicy, service
wiring, API docs). Because they are continuously *used* and *validated*, they **cannot** go stale. The
build fails the moment a model diverges from the code. A prose doc can be accurate too, on the day it
is written. What it lacks is the thing that keeps it accurate: nothing reads it on every run, so nothing
notices when it falls behind. An executable model is read and checked continuously, so drift surfaces as
a failed build instead of a stale paragraph nobody reopened.

**Why now:** MBSE (modelling your system as typed source-of-truth) has long been *possible* and
rarely *done*: maintaining the models and satisfying the drift gates is tedious, and humans resent the
nagging. Agents dissolve that barrier. Regenerating artifacts and running the parity gates is exactly
the disciplined, repetitive upkeep they do without complaint. So agentic engineering finally makes MBSE
practical, and the same models let an agent operate a codebase larger than its context.

## Mechanism

The model catalog holds structured models (Backstage-dialect YAML for services, typed loaders for the rest)
that **import nothing**: pure data. Consumers read them at run/lint-time (a lint that *reads* the
meta-file is preferred over codegen, which is preferred over a hand-rolled copy). Every model is (a)
*pinned* by a doc-derived characterization test, (b) *held true* by a drift/parity gate, and (c)
frequently *read* or *generated-from*, so it is exercised constantly.

## Prerequisites

- **Structured models that import nothing.** Data, not code, so anything can read them cheaply.
- **Continuous consumption.** The model must be read on real runs, or it is just another doc.
- **A drift gate per model** ([drift-parity-gates](drift-parity-gates.md)). Without enforcement the
  "cannot drift" claim is a hope.

## Consequences & costs

- **Upkeep is real.** The models must be maintained and the drift gates satisfied on every change;
  this is exactly the tedium that stops humans, and the reason it needs agents.
- **A wrong model is worse than none.** An authoritative-looking model that has drifted misleads
  everything downstream; hence the drift gates are not optional.
- **Modelling discipline up front.** Deciding what to model, and in what dialect, is design work.

## Known uses

- The model catalog (typed YAML/JSON + loaders; imports nothing).
- The preference order: a stable lint that reads the meta-file, over codegen, over a hand-rolled copy.
- Each model's doc-derived characterization pin.

## Related mechanisms

- **Bridge** — every model here couples an agent-side use (query/inject) to a product-side use
  (govern/generate); see the individual models below.
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the hard mechanism that makes "cannot
  drift" true.
- *See also* — the six models: [component-zone](component-zone-model.md) ·
  [synchronization](synchronization-model.md) · [concurrency-contracts](concurrency-contracts.md) ·
  [service-flow](service-flow-model.md) · [deployment-topology](deployment-topology-model.md) ·
  [domain-registries](domain-registries.md); and the mechanisms
  [codegen](model-driven-codegen.md) · [query-surface](query-surface.md) ·
  [consumption](meta-model-consumption.md).
