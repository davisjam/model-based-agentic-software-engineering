# Mediator & single-writer contracts

**Intent** — Typed registries of the system's *concurrency contracts*: which subprocess invocations are
serialized by a mediator, and which state-mutation functions are single-writer / monopoly. "Who may
run this, and how many at once" becomes declared and enforceable.

| | |
|---|---|
| Summary | Declared mediator and single-writer contracts, coverage-checked. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — typed contracts *held true* by the mediator enforcers + a registry-coverage lint |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

Concurrent agent worktrees share a host and shared state. Two contract classes keep them from trampling
each other: **mediators** (a subprocess like `dotnet test` must run through the serializer, not raw) and
**single-writer contracts** (a state-mutation function must have exactly one writer, no concurrent
mutation). Undeclared, both silently break. A raw `dotnet test` slips the serializer; a second writer
corrupts state; and the breakage is a race, discovered late and hard.

## Why it's not just "the mediators/enforcers already handle it"

The enforcers (test-serializer, build-serializer, the role guard) *act*, but they need a **declared
contract** to act against ("which subprocesses are mediated, which functions are single-writer"), or a
newly-added subprocess/mutator is simply *not covered* and nobody notices. These registries **declare**
the contracts, so a coverage lint can flag a mediated-class call or a state mutator that isn't wired.
Can an enforcer guard a call nobody remembered to route through it? It cannot; it only sees what
reaches it. The declared contract closes that gap: coverage checks the registry against the code and
names the mutator that should be contracted but isn't.

## Mechanism

The [[mediator-registry]] holds the dev-time subprocess serializers (the test/build serializers, the
[[aggregate-lint-runner|whole-repo lint mutex]], the commit-slave serializer): what each mediates, its
cap, its bypass-env. The [[single-writer-registry]] declares single-writer / monopoly contracts for
state-mutation functions. Enforcers and coverage lints read these to refuse unmediated calls and flag
uncovered mutators.

## Prerequisites

- **A mediator registry** (subprocess → serializer, cap, bypass) and a **single-writer registry**
  (function → monopoly contract).
- **Enforcers keyed on the registry** so an unmediated call is refused.
- **Coverage lints** so a new subprocess/mutator that should be contracted is flagged.

## Consequences & costs

- **New mediated subprocess / new mutator ⇒ a registry entry** or a coverage-lint failure.
- **The contract is only as good as the enforcer.** A declared-but-unenforced contract is documentation.

## Known uses

- The [[mediator-registry]]: the dev-mediator (subprocess-serializer) registry for the host's
  concurrency locks.
- The [[single-writer-registry]]: single-writer / monopoly contracts.
- The mediator enforcers ([test-serializer](../../agent/mediators-and-resource-locks/test-serializer.md) et al.).

## Related mechanisms

- **Bridge** — the agent [mediators & resource locks](../../agent/mediators-and-resource-locks/test-serializer.md)
  family *enforces* these contracts (agent side) ◀──▶ the model *declares* the concurrency the codebase
  must honour (product side).
- *See also* — [synchronization-model](synchronization-model.md): the OS-lock layer beneath these
  higher-level contracts.
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the coverage lints keeping the
  registries complete.
