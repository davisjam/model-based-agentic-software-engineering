# Per-mutator attribution stamps

**Intent** — Every remediation verb that mutates a document emits an attribution stamp *embedded in the
artifact* through one sanctioned stamp-writer per format, so every change is durably attributable and the
mutation history is reconstructable after the fact (our instances: a single PDF stamp-writer held as the
sole surface by a ban-lint, and an append-only OOXML attribution registry).

| | |
|---|---|
| Summary | Every mutation embeds an attribution stamp in the artifact. |
| Target | Product · **Provenance & attribution** |
| Form | `audit-trail` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *audit record* — the [F10 wiring lint](f10-wiring-lint.md) makes it BLOCKING that every verb stamps |

*Its place in the environment — the **canonical mechanism** for **PROVENANCE · Track provenance and trace causes**.*

## Motivation — the failure it kills

When a remediated document comes out wrong, you need to know *which pass made which change*; otherwise
RCA is guesswork across many passes and four formats. Without attribution, a mutation is anonymous: you
can see the output is wrong but not who wrote it or why. The failure is *unattributable mutations →
un-debuggable output*, and it recurs on every mutation.

## Why it's not just "log what each pass does"

Logging what each pass does works — until someone inspects the delivered document months later, and the
logs have scrolled away and were never attached to the artifact in the first place. A stamp lives
**in the document, at the mutation site**, so [derive-changelog](derive-changelog.md) can reconstruct the
full attributed history *from the artifact itself*, any time. A visibility model keeps it honest for
delivery: stamps default to `Debug` and are stripped before delivery, while user-visible passes opt into
`Preserved`.

## Mechanism

Each format has one sanctioned stamp-writer, and the raw stamp mutator is lint-banned so the writer is
the sole surface: PDF mutations stamp through a stamp-writer helper (our instance:
`MutatorStampHelper.WriteStamp`), OOXML through an append-only attribution registry (our instance:
`OoxmlAttributionRegistry.AppendEntry` / `TryAppendEntryForElement`). Visibility is `Debug` by default,
`Preserved` for user-visible passes; a strip step removes `Debug` stamps before delivery.

## Prerequisites

- **A stamp surface per format** and a **helper as the sole stamp API** (so stamps are uniform).
- **A visibility model** (Debug vs Preserved) and a **strip step** before delivery.
- **A completeness guarantee** that every verb stamps, supplied by the F10 lint.

## Consequences & costs

- **Document overhead.** Stamps add content; `Debug` stamps are stripped before delivery to avoid
  shipping scaffolding.
- **Helper-only discipline.** Bypassing the helper produces an un-uniform stamp; it is lint-guarded.
- **Every new verb must wire it** — the cost that the F10 lint turns from "remember to" into "must."

## Known uses

- `MutatorStampHelper.WriteStamp` (PDF); `OoxmlAttributionRegistry.AppendEntry` (OOXML).
- The `Debug` / `Preserved` visibility model; `strip-attribution` before delivery.

## Related mechanisms

- **Counterpart** — [f10-wiring-lint](f10-wiring-lint.md) (hard) guarantees *every* mutator verb stamps;
  it is the counted sensor that makes this audit-trail complete.
- **Consumer** — [derive-changelog](derive-changelog.md) reads these stamps to reconstruct the history.
- **Enabler** — the closed [remediation-verb set](../repair-vocabulary/remediation-verbs.md) makes
  "stamp every verb" a finite, achievable requirement.
