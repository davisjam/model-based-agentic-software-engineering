<!-- note-spread: 2 -->

**Intent** — Link every model to its lint, its code entry-point, its proof, its related models, and its
registry as a structured graph whose every edge is a *derived* obligation a lint re-checks — each edge
terminating on a resolvable *symbol*, never a line number — so when the code moves and breaks an edge, the
model↔code drift becomes mechanically visible at scan time. The governing principle: derived edges defend;
snapshotted ones drift.

## Problem

The executable models that let a context-bounded agent operate a context-exceeding codebase are useful only
while the map equals the territory. A model states more than facts about *itself*: it names the lint that
enforces it, the code root it governs, the test that verifies it, the registry it reconciles against — the
joins an agent walks between levels of abstraction, which rot the moment the code moves without them.

The failure is silent traceability rot: a model's reference to a code symbol goes stale when the symbol is
deleted, renamed, or moved, and nothing notices — the model still *looks* authoritative while pointing at a
ghost. The design
was read off real drift: an audit of recently-closed work harvested roughly two dozen drift instances — the
clean cases all read the source of truth at check time, the drifted ones kept a rotting parallel list.

<!-- note-fold -->

## Mechanism

- **Anchor to symbols, not lines.** Every edge terminates on a resolvable `(path, symbol, resolver)`
  reference with no line number — line numbers churn under every edit above them. The resolver is chosen by
  file extension — a language-aware analyzer for code, a membership check for registry keys, a heading for
  docs — so an anchor cannot silently prove a code symbol textually; a textual-presence fallback is a
  declared, visible weak edge, never accidental.
- **Structure the edges over a closed vocabulary.** An edge carries a source, a destination, an edge kind
  from a closed set (governs / enforced-by / verified-by / derived-from / points-at / related-to), and a
  non-optional derivation. A kind-pair table declares which node genres each edge kind may connect, so a
  mis-shaped edge is caught.
- **Re-derive every edge at check time.** A meta-lint walks the graph and, per edge, runs the edge's
  derivation against its target anchor and asserts it resolves. A vanished symbol reddens the edge.
- **Guard the anchors themselves.** One drift class needs its own guard: a *replacement* implementation is
  built but the surfaces naming which to run are never repointed, so the system defaults to the retired one.
  A registry declares, per seam, the live implementation and the census of pointer surfaces that must name
  it; a derived lint asserts they agree.
- **Walk the graph both ways.** The same anchors that catch drift make the graph a navigable cross-layer
  index. An agent at a symbol jumps up to the invariant it realizes; an agent at a model jumps down to the
  code — pulling just the relevant slice into context, not the whole tree.

## Engineering Consequences

Drift-detection and traversal are two faces of one property: an anchor that resolves means both that the
model's claim is currently true *and* that the agent's traversal is a current slice of the system. A sharp
by-product: a model referencing a symbol with no clean anchor — logic buried inline in a god-function —
surfaces that absence as an abstraction-completeness finding routing to a refactoring target, not an error. Against a fan-out over twelve models, it classified
roughly six-hundred anchors and caught about fourteen genuine drifts no existing lint fired on.

## Implementation Seam

The symbol-anchor reference and its per-extension resolvers, from static analyzers that already ship; the
edge type with its closed kind vocabulary and kind-pair table; the re-derivation meta-lint, landing
audit-only then blocking; and the active-implementation registry with its pointer-agreement lint. Resolution
is costly — a cross-reference round-trip per symbol over a large tree — so it runs at definition-of-done or
audit cadence, a fast keyword companion catching the cheap cases inline.

## Known Limitations

Resolution catches deletion, not demotion: a symbol that still exists but no longer plays the role the edge
claims resolves green, so the keyword companion for present-tense role-currency is the complement. A
weak-prover fallback is a standing warning — a code anchor that resolves only by textual presence re-admits,
if left un-burned-down, the drift the strong prover exists to remove. The edge vocabulary has to fit the domain: a relationship the closed kind set can't express forces an enum
change — the honest signal that the join web grew a dimension, not a licence for a free-form string edge.
