<!-- note-spread: 1 -->

**Intent** — Treat the top-level governance document as enforced infrastructure: a stable-numbered rule
index, loaded into every agent's boot context, held honest by its own enforcement counterpart — a
bloat/cap lint plus a rule-conformance lint — so the document that carries every other mechanism cannot
silently rot.

## Problem

The failure class is governance that doesn't bind and doesn't last. A convention that lives in someone's
head or a stale wiki page never reaches a fresh agent, so the failure it was meant to prevent recurs. A
living rules document rots the other way: it bloats until nothing in it is read, or its rules drift out
of sync with the canonical docs they summarize. Both compound under a fleet — the document is booted by
every agent, so a bloated or drifted index taxes or misleads every dispatch, continuously.

## Mechanism

Each rule is a short boot-context statement plus a cross-reference to the canonical deep doc that carries
it in full. Numbers are stable, never renumbered, so the index doubles as a citable namespace addressable
across the codebase. An admission predicate — the earns-its-spot test: regression-preventing, and
non-derivable from the local file, and non-local — decides what may enter; a router sends everything else
to a sub-doc or a code comment. Two blocking lints hold the form: a bloat/cap lint fails the build past
the scannable budget, and a rule-conformance lint fails when a rule stops cross-referencing its canonical
doc.

## Engineering Consequences

A rule written here is enforced on every subsequent agent boot without re-inspection — binding by
construction, not advisory reference. The document is governed the way an artifact is: it carries a
budget, an admission predicate, and lints that fail the pipeline. The same load that makes it binding is
its price — it taxes every dispatch across the whole fleet, so benefit and cost are the same thing.

## Implementation Seam

The governance document itself, its boot-context loader, the bloat/cap lint, the rule-conformance lint,
and the "what belongs in this file" meta-section that carries the admission rule and its router. The
loader makes the index binding; the two lints keep it scannable and undrifted.

## Known Limitations

A hard budget means perpetual triage: admitting a new rule eventually means evicting one to a sub-doc, so
the index is never done and the eviction call is judgment-heavy. Presence is not obedience — a rule in
the index does not make agents follow it, which is why a separate audit re-runs owned checks at HEAD
rather than trusting the index ([appendix: epic-definition-of-done]). Stable numbering accretes history:
retired rules leave gaps forever.
