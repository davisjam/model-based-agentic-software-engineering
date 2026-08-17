<!-- note-spread: 2 -->

**Intent** — A fleet of lints and tests enforces *bidirectional parity between each model and reality* —
every model row maps to a real thing on disk, and every real thing maps to a model row — so a model cannot
silently drift from the code it governs.

## Problem

An executable model is only trustworthy while it stays true. The failure this kills is silent drift: the
model says one thing, the code does another, and everything downstream — dispatch, code generation, deploy —
reasons from a lie. Because the model *looks* authoritative, drift is worse than a missing model. It recurs
whenever code changes without the model, or the model changes without the code.

<!-- note-fold -->

## Mechanism

Each model gets a gate — sometimes a pair — that reads the model at check time and enumerates reality, then
asserts both inclusions: every model row exists on disk, and every real thing is modeled. A service-flow
parity lint compares tree to spec both ways; an API-drift lint compares handler to contract; a lock lint
compares each declared lock to a real lock site. Either direction diverging turns the gate red and blocks the
build.

## Engineering Consequences

The model can now generate parts of the system — network policy, wiring — because the gate guarantees the
generated side stays equal to the declared side. A one-way regenerate-from-code check cannot express that; it
makes code the source of truth and leaves the model free to lie. Bidirectional parity is stricter, so it also
fails on legitimate transitions. That is the point: a change must update both sides in the same commit.

## Implementation Seam

Each gate needs a machine-readable model, a machine-readable reality to compare it against, and blocking
placement in the build. Where a lint can read the model file directly, prefer that over code generation, and
generation over a hand-copied assertion.

## Known Limitations

Every model carries the cost of a gate to author and maintain, a real breadth of enforcement surface. A wrong
parity predicate is its own hazard — it produces phantom drift that erodes trust, or false confidence that
hides the real thing. A model with no machine-readable reality to check against cannot be gated at all.
