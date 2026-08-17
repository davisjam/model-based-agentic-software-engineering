<!-- note-spread: 1 -->

**Intent** — Route *all* reads and writes of a complex file format through one structured model, with raw
access to the underlying library banned by a lint, so the format's invariants are compiler-checked and every
mutation passes through a surface that already encodes them.

## Problem

The raw PDF library is a minefield of failures invisible at the call site. Forget to mark an indirect object
modified and the write is silently dropped on save. Add a tag or write a dictionary key directly and you can
corrupt the structure-tree root — the exact class that produced a real production corruption. Nothing enforces
these invariants in one place, so scattered raw calls make the same bug class recur at every site.

## Mechanism

Callers read through one entry point and write through typed mutators. A ban-lint fails the build on any raw
constructor, tag insertion, or dictionary write. Each typed mutator wires the mark-modified discipline and
attribution stamping, so the invariants ride on the model and a new verb cannot land un-wired.

<!-- note-fold -->

## Engineering Consequences

The bug becomes unrepresentable, not merely discouraged: the raw API is unreachable, so a reviewer no longer
has to spot a missing mark-modified call in a diff that looks correct. The model is the construction that
removes the class; the ban-lint is the counted sensor that keeps every call site on the seam. The seam also
pins the library version, because a minor bump can silently change auto-tagging.

## Implementation Seam

Two artifacts carry the pattern: the typed mutators under one primitives module, and the ban-lint on the raw
API. Standing up the seam means migrating every existing call site, then holding the line with the lint.

## Known Limitations

The model must cover the whole surface callers need; a missing operation forces either a lint escape (a hole)
or a model extension (friction, but the right fix). Pinning the library for tag-tree stability makes upgrades
deliberate, gated work. The mutators plus the ban-lint are code to keep current as the format's needs grow.
