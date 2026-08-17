<!-- note-spread: 2 -->

**Intent** — A fleet of blocking semantic lints over the tool's own source — banned APIs, silent-catch
bans, diagnostic-console bans, structured-seam violations — that fail the build on domain-invariant
violations the compiler and review can't catch.

## Problem

The codebase carries hundreds of structural invariants: no silent catch, no banned API in prod, every
cross-boundary call through its seam. Review cannot hold hundreds of invariants in a reviewer's head, and
the compiler enforces none of them — a silent catch, a banned API, a raw diagnostic-console call all
compile fine. The failure is structural drift that quietly reintroduces a defect class, and it recurs
continuously as code is written.

<!-- note-fold -->

## Mechanism

The lint fleet runs at commit and deploy. Each lint declares, in a self-describing header, which
components it scopes to, its severity, and a verb-of-checking docstring; blocking lints fail the build,
audit-only ones surface. A legitimate exception escapes through a scoped, reason-bearing suppression
comment on the offending line. The fleet sits atop a maxed-out commodity floor — the platform's own
static analysis, strict type-checking, and fast linters — rather than replacing it.

## Engineering Consequences

A semantic lint encodes an invariant the type system can't express and fails the build, doing
mechanically what review does by attention and the compiler doesn't do at all — the "move audits to
lints" discipline made concrete. The costs are real. Hundreds of lints are hundreds of things to keep
current. A too-strict lint blocks legitimate code until a suppression is added, a small audited hole. And
the custom fleet only earns its keep atop the commodity floor; without that floor, the quality grade
rests on the wrong thing.

## Implementation Seam

A lint framework with per-lint scope and severity declaration, the invariants made mechanically
detectable, and a runner wired into the gates with a scoped escape hatch. A runnable example carries the
whole shape: the self-describing declaration block, the find-violations then emit then exit-code body,
the suppression escape, and the audit-only-to-blocking migration.

## Known Limitations

An invariant you can't express as a mechanical check can't join the fleet. A lint is itself code that can
fail: one built on a regex once backtracked catastrophically on a real input and hung the deploy gate —
the checker that guards the fleet became the thing that stalled it. The cure was not a better regex but
deleting the surface, reaching for the parser and letting the whole class go. A checker over structured
source belongs on a parser, not a pattern.
