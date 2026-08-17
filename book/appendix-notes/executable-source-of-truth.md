<!-- note-spread: 2 -->

**Intent** — Model the system as structured data that tools read on every run and generate real artifacts
from. The model becomes executable documentation that cannot drift, and the codebase becomes operable by a
context-bounded agent — the interface through which that agent operates a context-exceeding codebase.

## Problem

A large codebase exceeds any agent's context window; no agent can hold hundreds of thousands of lines. Left to
read the raw code, an agent gets lost, re-derives the architecture badly, and drifts. The architecture itself
lives only implicitly, scattered across the code, so humans re-derive it too. The failure is no shared,
authoritative, compact representation of the system, which caps how large a codebase agents can operate on at
all.

<!-- note-fold -->

## Mechanism

The model catalog holds structured models — a service dialect for some, structured loaders for the rest — that
import nothing: pure data. Consumers read them at run and lint time, with a stable lint that reads the
meta-file preferred over codegen, which is preferred over a hand-rolled copy. Every model is pinned by a
doc-derived characterization test, held true by a drift and parity gate, and frequently read or
generated-from, so it is exercised constantly. Prose architecture docs drift because nothing forces them true;
an executable model is read and checked continuously, so divergence surfaces as a failed build instead of a
stale paragraph nobody reopened.

## Engineering Consequences

Because the models are continuously used and validated, they cannot go stale — the build fails the moment a
model diverges from the code. A limited slice of artifacts, such as config, docs, and IPC contracts, is
generated from the model, so those cannot diverge either. Why now: maintaining the models and satisfying the
drift gates is tedious upkeep humans resent, but agents do that disciplined, repetitive regeneration without
complaint, so agentic engineering finally makes model-based system engineering practical and lets an agent
operate a codebase larger than its context.

## Implementation Seam

The catalog holds structured YAML, JSON, and loaders that import nothing; the preference order runs
stable-lint-reads-meta-file over codegen over hand-rolled copy; each model carries a doc-derived
characterization pin; and a drift and parity gate per model is the counted sensor that makes "cannot drift"
true [appendix: drift-parity-gates].

## Known Limitations

Upkeep is real: the models must be maintained and the drift gates satisfied on every change, exactly the
tedium that stops humans and the reason it needs agents. A wrong model is worse than none — an
authoritative-looking model that has drifted misleads everything downstream, which is why the drift gates are
not optional. Deciding what to model, and in what dialect, is design work paid up front.
