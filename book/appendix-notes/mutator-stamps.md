<!-- note-spread: 1 -->

**Intent** — Every operation that mutates a document embeds an attribution stamp *in the artifact
itself*, written through one sanctioned stamp-writer per format, so any change stays attributable and the
mutation history can be reconstructed after the fact.

## Problem

When a remediated document comes out wrong, you need to know which pass made which change. Without
attribution, a mutation is anonymous: the output is visibly broken, but nothing says who wrote it. Root-cause
analysis becomes guesswork across many passes and four file formats, and the failure recurs on every
mutation.

## Mechanism

Each format exposes one stamp-writer, and the raw stamp mutator is lint-banned so the writer stays the sole
surface. PDF passes stamp through a stamp-writer helper; the Office formats stamp through an append-only
attribution registry. A visibility model keeps delivery honest: stamps default to a debug tier and are
stripped before the document ships, while user-visible passes opt into a preserved tier that stays in the
output.

## Engineering Consequences

Attribution lives with the artifact, not in a log that scrolls away, so a changelog tool can rebuild the
full attributed history from the delivered file at any time. The cost is document overhead — debug stamps
add content, which is why the strip step removes them before delivery. Bypassing the helper yields a
non-uniform stamp, so the ban-lint holds the single surface.

## Implementation Seam

The stamp-writer helper (PDF) and the attribution registry (Office) are the two wiring points; a raw-mutator
ban-lint fails the build on any call that skips them. A separate wiring lint makes it blocking that *every*
remediation verb stamps, so a new verb cannot land unattributed.

## Known Limitations

Completeness rides on that wiring lint: a verb the lint does not cover can mutate silently. The debug/preserved
split is an authoring decision, so a pass that picks the wrong tier either leaks scaffolding into delivery or
loses attribution the operator wanted. Ultimately, the stamp is only as trustworthy as the strip step that
runs before the document leaves the pipeline — that step is the guarantee's floor.
