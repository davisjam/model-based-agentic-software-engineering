# Telemetry-collection provenance (per-stream origin, landing, per-env coverage)

**Intent** — Model each telemetry stream as a typed record of its **provenance** — where it originates,
where it lands, and in which environments it is actually collected — so the coverage of the observability
surface is a declared, checkable fact rather than an assumption. The failure class it kills is the silent
one: a metric collected in production but quietly absent in the local or staging plane, so a developer
reasons over a signal that isn't there and never learns it's missing (our instance: a per-stream registry
of origin, landing sink, and per-environment coverage across the telemetry streams).

| | |
|---|---|
| Summary | Each telemetry stream's origin, landing, and per-environment coverage as a checkable record. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — each stream's origin, landing, and per-environment coverage are declared and reconciled against the real emit and collection sites; a stream emitted but not collected in a declared-covered environment is a build finding |
| Derivation | `model-from-code` — the provenance record is reconciled against the real emit and collection sites |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Telemetry is trusted precisely when it is present, and its presence is uneven across environments in ways
nobody wrote down. A metric wired up in the production deployment may never be collected locally, because
the collector is configured differently or not at all. The developer profiling a slow path locally reads
the dashboard, sees the metric flat, and concludes the path is cheap — when in truth the metric was never
emitted in that plane. The reverse also bites: a stream collected everywhere *except* the one environment
an incident is unfolding in. In each case the reasoning is corrupted not by a wrong number but by an
**absent** one that looks like a present zero. Nothing states which streams land where, or in which
environments each is actually collected, so the coverage gaps are invisible until a decision is made on a
signal that was never there.

## Why it's not just a list of metrics

A catalog of metric names tells you what *could* be emitted; it says nothing about **where each lands or
in which environments it is really collected**, and that per-environment coverage is the fact the failure
turns on. The provenance model types three things a name list omits: the origin (what emits the stream),
the landing (the sink it flows to), and the coverage vector (which environments actually collect it). With
those, a check can assert a property no name list can express — "this stream is declared collected in the
local plane, and the local collector is in fact configured to receive it" — and flag the mismatch that
otherwise surfaces as a misread dashboard. The model also **distinguishes a true zero from an absent
stream**, the exact confusion that makes missing telemetry so dangerous: a present-but-zero metric and a
never-collected one look identical on a graph, and only a declared coverage vector, reconciled against the
collectors, tells them apart.

## Mechanism

- **Each stream carries its origin.** The record names what emits the stream — the service, the code path,
  the event — so a metric is traceable back to its source, not just its name on a dashboard.
- **Each stream names its landing.** The sink the stream flows to (a metrics backend, a log store, an
  event bus) is declared, so "where does this data go" is answered by the model.
- **Each stream declares a per-environment coverage vector.** For each plane — local, staging, production —
  the record states whether the stream is actually collected there, making coverage an explicit fact
  rather than an assumption.
- **Reconcile the record against the real sites.** The declared origins, landings, and coverage are checked
  against the emit points and the collector configuration, so a stream emitted but not collected in a
  declared-covered environment, or collected without a record, is a build finding.
- **Separate absent from zero.** Because coverage is declared per environment, a flat metric can be
  classified — genuinely zero where it is collected, or simply absent where it is not — instead of being
  read as a value it never had.

## Prerequisites

- **Multiple environments with differing collection.** The model earns its keep when coverage varies by
  plane; if every stream is collected identically everywhere, a name list nearly suffices.
- **Reconcilable emit and collection sites.** The origins and the collector configuration must be checkable
  against the declared record, or the coverage vector is an unverified claim.
- **A notion of "collected here" that a check can evaluate.** Per-environment coverage has to be a fact a
  gate can test against the real collectors, not a hopeful annotation.

## Consequences & costs

- **Missing telemetry stops being invisible.** A stream declared collected in an environment where the
  collector doesn't receive it reddens the gate, so the misread-dashboard failure is caught at build time
  instead of mid-analysis.
- **The coverage vectors must track the collectors.** A record that says "collected locally" after the
  local collector was reconfigured gives false confidence; the reconciliation gate is what keeps the vector
  honest.
- **It models presence, not usefulness.** The provenance record proves a stream is collected where it
  claims, not that the stream is *worth* collecting — a well-covered but useless metric passes, a scope the
  model does not police.

## Known uses

- A per-stream telemetry registry recording each stream's origin, its landing sink, and a per-environment
  coverage vector across the local, staging, and production planes.
- A check reconciling the declared coverage against the real emit points and collector configuration, so a
  metric emitted in production but silently uncollected locally is a build finding.
- Coverage vectors used to tell a genuine zero from an absent stream, so a developer profiling in one plane
  is not misled by a metric that plane never collected.

## Related mechanisms

- **Sibling** — [caused-by-provenance](../../agent/lifecycle-and-observability/caused-by-provenance.md): both are provenance models; that one
  records *what change caused* a code effect, this one records *where an observability stream comes from and
  lands*. Same provenance discipline, different subject.
- **Consumer** — [typed-event-bus](../../agent/lifecycle-and-observability/typed-event-bus.md): the event streams this model tracks the coverage of
  are often the very topics an event bus carries; the provenance record says which of them land where.
- **Layer** — [drift-parity-gates](drift-parity-gates.md): the reconciliation that keeps the declared
  origins, landings, and coverage equal to the real emit and collection sites.
- *See also* — [deploy-heartbeats](../../agent/lifecycle-and-observability/deploy-heartbeats.md): a concrete telemetry stream whose per-environment
  presence is exactly the kind of coverage fact this model would declare and check.
