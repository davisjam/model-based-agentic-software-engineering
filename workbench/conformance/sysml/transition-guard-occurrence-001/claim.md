# sysml/transition-guard-occurrence-001

**MAGE construct** — a machine, its states, and a guarded transition (`machines`, the
`state-machine` substrate; the guard is a transition's `requires:`).

**Registry row** — `MODEL_TYPES` `state-machine`, `semanticBasis.kind: "borrowed"`,
`standard: "SysML v2"` (`src/engine/model-types.ts`, the `state-machine` entry).

**Standard concept** — a TransitionUsage and the Succession it owns: a transition that occurs, and
so orders its source before its target in time, only when its guard holds.

## The specification, quoted

The decisive material is a **declared invariant in a normative machine-readable library**, not a
sentence. KerML 1.0 Kernel Semantic Library, `TransitionPerformances.kerml`
(`Semantic-Library.kpar`, OMG `https://www.omg.org/spec/KerML/20250201/`):

```
abstract behavior TransitionPerformance {
    bool guard[*] subsets enclosedPerformances;
    feature transitionLink: HappensBefore[0..1];
    private connector all guardConstraint: TPCGuardConstraint[*]
        from [0..1] transitionLink to [*] guard;
}

assoc struct TPCGuardConstraint {
    end guardedLink [0..1] feature constrainedHBLink: HappensBefore;
    end bool constrainedGuard;
    private inv { allTrue(constrainedGuard()) }
}
```

Three declarations settle it with no prose in between. A transition's `transitionLink` is a
`HappensBefore` of multiplicity `[0..1]`, so a declared transition may have **no** happens-before
link at all. Every `transitionLink` is connected to its `guard`s by `TPCGuardConstraint`. And
`TPCGuardConstraint` carries `inv { allTrue(constrainedGuard()) }`. So a happens-before link exists
only where every guard evaluates true, and the lower bound of 0 is what a transition gets whose
guard never can.

SysML v2.0 (OMG Document Number **formal/2026-03-02**, March 2026), clause **8.3.18.9
TransitionUsage**, says the same thing in prose, and `SysML.xmi` carries it verbatim as the
element's `ownedComment`:

> When triggered by a `triggerAction`, when its `guardExpression` is true, the `TransitionUsage`
> asserts that its `source` is exited, then its `effectAction` (if any) is performed, and then its
> `target` is entered.

The chain from the SysML construct to the KerML invariant is also declared: `Actions.sysml` defines
`abstract action def TransitionAction :> Action, TransitionPerformance` as "the base type of all
TransitionUsages", and `SysML.xmi`'s `checkTransitionUsageSpecialization` requires
`specializesFromLibrary('Actions::transitionActions')`.

## The ONE interpretation this fixture pins

> **A transition's guard conditions whether the transition occurs at all, so a declared transition
> that no reachable configuration can enable contributes no step and its target is not entered by
> that route.**

Operationally, in `model.mage.yaml`: `gate` has states `closed`, `armed`, `open`; `arm` and `disarm`
move between the first two; `unlock` is the sole edge into `open` and requires `key: 1`. No
transition in the machine assigns `key`, and its initial value is 0.

| query | verdict | why |
|---|---|---|
| `open-is-never-entered` — `reach` `gate.state: open` | `refuted` | no reachable configuration enables `unlock` |
| `unlock-never-occurs` — `transition-live` on `armed -> open` | `refuted` | the same claim asked about the transition rather than the state |
| `armed-is-entered` — `reach` `gate.state: armed` | `holds` | the positive control: the configuration space is explored and non-empty |

Both forms are asked because the correspondence is about the **transition**, and `reach` alone would
let a reader take the claim to be about state connectivity.

**What would be false if the construct meant something else.** Read a MAGE transition as a static
edge of the state diagram — adjacency, with `requires:` as commentary — and `open` is one hop from
`armed`, so both pinned queries answer `holds`. The pinned pair is therefore not satisfiable by both
readings.

The conformance test adds the converse, and it is the sharper half: adding `effects: { key: 1 }` to
the `arm` transition flips both pinned queries to `holds` **without adding, removing or retyping a
single state or edge**. The state diagram is byte-identical in shape; only guard satisfiability
changed. That is what shows the verdicts track occurrence rather than drawing.

## What this fixture does NOT establish

- **Triggers are not exercised, and a MAGE transition has none.** SysML's TransitionUsage is a
  *triggered* transition with a `triggerAction` accepting a payload. MAGE has `sync:` for declared
  events, which is a different mechanism, and this fixture uses neither. The claim is about the
  guard only.
- **Entry, do and exit actions are not exercised.** `StateAction` declares `entry`, `do` and `exit`;
  MAGE states carry none.
- **"Happens before" is not time.** The standard's `HappensBefore` is an ordering of occurrences.
  MAGE's analysis is over a finite configuration space with no clock, and
  `DESIGN-v02-ltl-foundation-261004.md` owns the temporal semantics. Nothing here claims MAGE
  realizes `Clocks` or `Observation`.
- **The spec's own guard derivation is defective and is not relied on.** SysML v2.0
  formal/2026-03-02 clause 8.3.18.9's constraint `deriveTransitionUsageGuardExpression` selects
  `kind = TransitionFeatureKind::trigger` rather than `::guard`, and its description sentence reads
  "The triggerActions of a TransitionUsage are…" — copied from the sibling constraint. `SysML.xmi`
  carries the identical body. The claim above rests on the KerML library invariant and on the
  TransitionUsage Description, neither of which depends on that derivation. Recorded here because a
  later reader who goes to the spec will meet it.
- **It says nothing about the next construct, and nothing about completeness** (section 35.6).
