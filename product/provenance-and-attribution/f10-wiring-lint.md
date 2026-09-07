# F10 mutator-stamp-wiring lint

**Intent** — A lint that fails the build if *any* mutator verb in the Model `Primitives` lacks stamp
wiring, so a new mutator cannot land producing unattributable mutations.

| | |
|---|---|
| Summary | Fail the build if any mutator verb lacks a stamp. |
| Target | Product · **Provenance & attribution** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) · *blocking* — scans every mutator verb; fails the build on an unwired one (0 open gaps) |
| Governs | `pdf-model` · `office-models` — every mutator verb in the document models is stamped |

*Its place in the environment — a **variant / known-use** of **Caused-By Provenance**, under **PROVENANCE · Track provenance and trace causes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

[Attribution stamps](mutator-stamps.md) only work if **every** mutator stamps. Add one new verb without
wiring and it silently produces unattributable mutations, a hole in the audit trail that no one sees
until an RCA hits it and finds no stamp. The failure is *an unstamped mutator (an attribution gap)*, and
it recurs when a new verb is added — usually under time pressure, when "remember to stamp" is
most likely to be forgotten.

## Why it's not just "remember to add the stamp" (or "review new mutators")

Will a reviewer scanning a diff catch the stamp that *isn't* there? A present stamp is visible; a missing
call is not — nothing in the diff shouts "no stamp here." The F10 lint answers by not relying on the
reviewer at all: it **mechanically checks that every mutator verb** in the `Primitives` directories calls
stamp wiring, and fails the build on a gap (HIGH-severity, held at 0 open gaps). A completeness check
over all verbs sees the absence a per-author reminder misses. This is the counterpart that turns "we
attribute mutations" from an aspiration into a guarantee.

The lint stays cheap because it checks so little. It never models what a mutator *does* — it reads none
of the remediation logic, verifies no output, understands no format. It asserts one control-flow-order
property: every path that performs the guarded action calls the stamp routine on the way out.
Completeness over the whole verb set costs almost nothing to check precisely because the property lives
at the level of "was the call made," not "was the work correct." Pitch the guarantee at the exit and a
scan of the call graph settles it; pitch it at the behavior and no lint could.

## Mechanism

The mutator-stamp wiring lint scans the `{Pdf,Slides,Docs,Sheets}Model` `Primitives` directories for
mutator verbs and asserts each calls the stamp wiring. It is BLOCKING; a new verb without wiring is a
HIGH-severity finding. The invariant has been held at 0 open gaps.

## Prerequisites

- **A detectable "mutator verb" pattern** in the `Primitives` layer.
- **A detectable stamp-wiring call** so the lint can tell wired from unwired.
- **A lint over the Primitives directories** run in the gates.

## Consequences & costs

- **The verb-detection heuristic is the weak point.** Miss a verb shape and a real gap passes; over-match
  and legitimate code fails.
- **Coupled to the Primitives structure.** A reorganization of the mutator layer needs the lint updated
  in step.

## Known uses

- The mutator-stamp wiring lint (F10, BLOCKING, 0 open gaps).

## Related mechanisms

- **Counterpart** — of [mutator-stamps](mutator-stamps.md): the stamps are the *construction* (the audit
  record), this lint is the *counted sensor* that guarantees they're complete. The canonical
  construction-held-by-detection pairing on the product side.
- *See also (sibling)* — [semantic-lints](../validation-and-conformance/semantic-lints.md): the F10 lint
  is a member of that fleet doing a completeness-over-verbs job.
- **Generalization** — [semantic-level-enforcement](../../agent/governance-doc-controls/semantic-level-enforcement.md):
  pitching the guarantee at "was the call made" rather than "was the work correct" is one case of the
  general move — place a mechanism at the semantic level where its property is legible *and* cheap to check.
