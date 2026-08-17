<!-- note-spread: 1 -->

*The next three mechanisms — this one, the model-derived obligation census, and symbol-anchored
traceability — teach one meta-principle three ways: replace copied knowledge with continuously-derived
knowledge. A snapshot is a drift bug waiting; a derivation cannot drift.*

**Intent** — Consume the models by querying them at runtime, never by embedding a hardcoded snapshot — so a
lint, test, or brief always reasons from the live model, and a copied-out value can't drift behind the model
it was copied from.

## Problem

The models are a bridge only if consumers read them. The moment a consumer hardcodes a snapshot — "our
packages are A, B, C" pasted into a lint or test — that copy drifts the instant the model changes, and the
consumer keeps passing while reasoning about a stale world. This is the single most common substrate-drift
vector: the model migrates, the copy is left behind, and the check now verifies the wrong thing. It recurs
at every consumer that reaches for a quick literal instead of a query.

## Mechanism

Consumers read the models at run- or lint-time — through the model query tool for agents and orchestration,
by direct import for other tools — rather than embedding values. A preference order codifies it: a lint that
*reads* the meta-file beats codegen, which beats a hand-rolled copy. A forward-policing lint fails a test
that embeds a snapshot of a queryable value, and a further rule has lints declare their component tags
against the component model rather than hardcoding scope.

## Engineering Consequences

There is one authoritative answer, and consumers derive it, so a model change updates every consumer at
once. A snapshot instead mints a private answer at each site, and each is a drift bug the day the model
moves. The cost is slight ceremony — a query call instead of a literal — plus a run/lint-time coupling: the
consumer now depends on the model being loadable when it runs.

## Implementation Seam

The query surface consumers read through, and the snapshot-ban lint that fails a test embedding a queryable
value. The meta-file-preference rule and the lint-scope-declares-against-the-model rule sit alongside as the
same read-don't-copy discipline.

## Known Limitations

The ban-lint's accuracy bounds the whole discipline: it must recognise a queryable value to flag its
snapshot, so it has to be built before it can be relied on as a live gate. Querying only helps where a read path exists: a value with no queryable model behind it has nothing to
derive from.
