# `derive-changelog` (reconstruct mutations)

**Intent** — A command that reconstructs the document's mutation history from the embedded stamp
registry, turning the [attribution stamps](mutator-stamps.md) into a readable, attributed ChangeLog
after the fact.

| | |
|---|---|
| Summary | Reconstruct the attributed mutation history from the stamps. |
| Target | Product · **Provenance & attribution** |
| Form | `audit-trail` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *audit record* — a reproducible reconstruction from the embedded stamps |

*Its place in the environment — a **variant / known-use** of **Caused-By Provenance**, under **PROVENANCE · Track provenance and trace causes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

The stamps are embedded in the artifact, but embedded data isn't *useful* until it can be read back into
a coherent history. Without a reader, attribution is present but inert — you have the evidence and no way
to assemble it into "pass X made change Y." The failure is *attribution that exists but can't be
consumed*, which shows up exactly when someone needs the history for RCA or user transparency.

## Why it's not just "read the stamps by hand" (or "diff input vs output")

Reading raw stamps by hand is tedious and error-prone, and an input-vs-output **diff shows *what*
changed but not *who* (which pass) or *why*.** `derive-changelog` reconstructs the *attributed* history
from the stamp registry: pass → change, each entry carrying its visibility. An attributed reconstruction
from provenance answers questions a raw diff cannot. It is the consumer that makes emitting the stamps
worthwhile: no reader, no reason to stamp.

## Mechanism

`derive-changelog` reads the embedded stamp registry and emits a ChangeLog JSON: each entry is a mutation
attributed to its pass, with its visibility (`Debug` / `Preserved`). It runs after remediation against
the produced artifact.

## Prerequisites

- **The stamps must exist and be structured.** [mutator-stamps](mutator-stamps.md) is a hard
  dependency.
- **A reader** that knows the stamp schema and reconstructs the ordered, attributed history.

## Consequences & costs

- **Only as complete as the stamps.** An attribution gap (which the [F10 lint](f10-wiring-lint.md)
  exists to prevent) becomes a hole in the reconstructed history.
- **Schema-coupled.** It depends on the stamp registry's shape staying stable across versions.

## Known uses

- The `derive-changelog` command (stamp registry → ChangeLog JSON, per pass, with visibility).

## Related mechanisms

- **Consumer** — reads [mutator-stamps](mutator-stamps.md): it is the read side of the attribution
  substrate.
- **Enabler** — of RCA and user-facing change transparency (a human reads the ChangeLog).
- *See also (counterpart)* — [f10-wiring-lint](f10-wiring-lint.md) guarantees the stamps this reader
  depends on are complete.
