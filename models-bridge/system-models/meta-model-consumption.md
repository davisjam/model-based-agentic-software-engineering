# Meta-model consumption discipline (read, don't hardcode)

**Intent** — Consume the models *by querying them at runtime*, never by embedding a hardcoded snapshot —
so a lint, test, or brief always reasons from the live model, and a copied-out value can't drift behind
the model it was copied from.

| | |
|---|---|
| Summary | Read the model at runtime; never hardcode a snapshot. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `constraint` — prevents the error by construction |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) · *blocking* — a forward-policing lint fails on embedded snapshots (verify the lint is built before relying on it as a live gate) |
| Governs | `all-models` — every model is read at runtime, never snapshotted |

*Its place in the environment — the **canonical mechanism** for **KNOW · Maintain authoritative system knowledge**.*

## Motivation — the failure it kills

The models are only a bridge if consumers *read* them. The moment a consumer **hardcodes a snapshot**
("our packages are [A, B, C]" pasted into a lint or test), that copy drifts the instant the model
changes, and the consumer keeps passing while reasoning about a stale world. This is the single most
common **substrate-drift** recurrence vector: the model migrates, the copy is left behind, the check
now verifies the wrong thing. It recurs at every consumer that reaches for a quick literal instead of a
query.

## Why it's not just "hardcode the list" (or "grep for it")

A hardcoded list is a *snapshot*; a queried model is a *source of truth*. With a snapshot, the answer's
authority is duplicated into every consumer and each copy is a future drift bug; with a query, there is
one authoritative answer and consumers *derive* it, so a model change updates every consumer at once.
Grepping the source is no better: it re-implements a fragile parser and couples the consumer to
file layout. The rule is **read the meta-model, never embed a copy** — itself lint-enforced, because
the temptation to snapshot is constant. Querying keeps one authoritative answer that every consumer
derives; copying mints a private answer at each site, and each is a drift bug the day the model moves.

## Mechanism

Consumers read the models at run/lint-time (via the [model query tool](query-surface.md) for agents and
orchestration, via direct import for other tools) rather than embedding values. A preference order
codifies it (a lint that *reads* the meta-file beats codegen beats a hand-rolled copy); a
forward-policing lint fails a test that embeds a snapshot of a queryable value; a further rule has lints
declare their component tags against the [[component-registry|component model]] rather than hardcoding
scope.

## Prerequisites

- **The models are queryable** (they exist and have a read path — the [query surface](query-surface.md)).
- **A lint that bans re-hardcoding** the queryable value, or snapshots creep back in.
- **A consumer culture of deriving, not copying.**

## Consequences & costs

- **Slightly more ceremony per consumer.** A query call instead of a literal (the intended trade).
- **Runtime/lint-time coupling.** The consumer depends on the model being loadable when it runs.
- **The ban-lint's accuracy.** It must recognise a "queryable value" to flag its snapshot (verify it
  is built).

## Known uses

- The [[component-registry]] and [[repo-query|model query tool]] read at runtime by the lint fleet + dispatch.
- The snapshot-ban lint (fails a test embedding a queryable value); the meta-file-preference rule; the
  lint-scope-declares-against-the-model rule.

## Related mechanisms

- **Bridge** — this is the *consumption* face: agent mechanisms
  ([dynamic-context-injection](../../agent/context-and-dispatch/dynamic-context-injection.md),
  [docs-hierarchy](../../agent/context-and-dispatch/docs-hierarchy.md)) and product lints
  ([coherence-lints](../../product/validation-and-conformance/coherence-lints.md),
  [doc-hygiene-lints](../../agent/governance-doc-controls/doc-hygiene-lints.md)) all read the models
  through this discipline rather than copying them.
- **Consumer** — [dynamic-context-injection](../../agent/context-and-dispatch/dynamic-context-injection.md)'s
  forward slicer reads the [component-zone model](component-zone-model.md) this way.
- *See also* — [query-surface](query-surface.md): the canonical query path this discipline uses.
