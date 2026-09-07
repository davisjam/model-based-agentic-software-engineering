# PdfModel (sole PDF mutation surface)

**Intent** — Route *all* reads and writes of a complex file format through one structured model, with raw
access to the underlying library banned by a lint, so the structure is compiler-checked and every
mutation passes through a surface that encodes the format's invariants (our instance: `PdfModel` over
the canonical PDF library).

| | |
|---|---|
| Summary | All PDF I/O through one structured model; raw canonical-PDF-library access banned. |
| Target | Product · **Canonical models & seams** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) · *blocking* — a raw-PDF-library ban-lint fails the build on any raw library call; the structured model is *construction*, the ban-lint is the counted sensor |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — the **canonical mechanism** for **CONSTRAIN · Constrain where and how agents act**.*

## Motivation — the failure it kills

The raw canonical PDF library is a minefield of silent, invisible-at-the-call-site failures. Forget `SetModified()` on an
indirect object and the write is **silently dropped** on save. Call `tagPointer.AddTag` or `dict.Put`
directly and you can corrupt the `/StructTreeRoot`, the exact class that produced the v172 corruption.
There is no single place to enforce these invariants, so scattered raw calls make the *same* PDF bug
class recur at every call site.

## Why it's not just "use the library carefully" (or "code-review the PDF calls")

The library's sharp edges are invisible where they're used — a missing `SetModified()` looks like correct
code, and reviewers miss it because nothing in the diff flags it. `PdfModel` makes the raw
API **unreachable**: typed mutators encode the invariants (they can't forget `SetModified()`), and the
raw-PDF-library ban-lint fails the build on any raw constructor, `AddTag`, `dict.Put`, or
`structRoot.AddKid`. The distinction is *a typed sole-seam whose raw alternative is lint-banned* versus
*disciplined use of a raw API*. The structured model is **construction**: the bug becomes unrepresentable.
The ban-lint is the **counted detection sensor** that keeps every call site on the seam.

## Mechanism

Read via `PdfModel.Read(path)`; write via the typed mutators in `Primitives/`. A raw-PDF-library
ban-lint fails the build on raw library constructors, `tagPointer.AddTag`, `dict.Put`, and
`structRoot.AddKid`. Each typed mutator wires the `SetModified()` discipline and stamp emission so a new
verb cannot land un-wired.

## Prerequisites

- **A structured model covering the domain surface.** Every operation callers need must exist as a typed
  mutator, or they're forced back to the raw API.
- **A ban-lint on the raw API** (the counted sensor) plus a migration of *all* existing call sites.
- **A pinned library version.** Minor bumps of the canonical PDF library can silently change
  auto-tagging, so the seam pins it and gates upgrades behind a regression suite.

## Consequences & costs

- **The model must cover everything.** A missing operation forces either a `noqa` escape (a hole) or a
  model extension (the right fix, but friction). An incomplete seam weakens the ban.
- **Version lock-in.** Pinning the PDF library for tag-tree stability means upgrades are deliberate, gated work.
- **Maintenance surface.** The typed mutators + the ban-lint are code to keep current as the format
  needs grow.

## Known uses

- `PdfModel.Read` + the typed `Primitives/` mutators (each wiring `SetModified()` + stamp emission).
- The raw-PDF-library ban-lints (one on the raw constructors/calls, one on helper leakage).
- The v172 `/StructTreeRoot` corruption: the defect class this seam eliminates.

## Related mechanisms

- **Counterpart** — the raw-PDF-library ban-lint (hard) holds this construction-mode seam
  in place; without it, "route through PdfModel" is an unenforced convention.
- *See also (sibling)* — [office-models](office-models.md): the same structured-model + ban-lint pattern for
  the OpenXML formats; the pair is the *defect-class consolidation* of raw-library corruption across
  all four document formats.
- *See also* — [canonical-walkers](canonical-walkers.md): how traversal over this structured model is done.
