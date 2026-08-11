The single-writer registry is the *exactly-one* half of concurrent-write safety. A mediator caps *how many*
may run; a single-writer contract names *who* may write. This page gives its five-field detail.

**(a) Quality property.** **Single-writer coverage** — *does every mutator of a given piece of shared state
have exactly one declared owner?* The failure it settles is a **torn or interleaved write**: two writers
corrupting the same state. A concurrency cap does not settle it — two mediated processes racing on one record
is still within a cap of two — so ownership needs its own check. A second discovered writer of a declared
single-writer state is a finding.

**(b) Structure.** A frozen record per owned piece of shared state, keyed by the state's identity.

- **`OwnedState`** — the identity of the shared resource (a registry file, a metadata row, a status field)
  that admits exactly one writer.
- **`Writer`** — the single function declared as its owner: the module and entry point permitted to mutate it.
- **The ownership relation** — each `OwnedState` names exactly one `Writer`; the registry is the closed set
  of those pairs the coverage lint checks the code against.

**(c) Representative figure.** A one-to-one ownership map: each shared-state node points to its single writer
node; a second inbound edge into any shared-state node is the violation the diagram makes visible.

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| Every declared shared state has exactly one writer | *□P* (safety) | Coverage lint reads the mutation sites of each `OwnedState`; more than one declared writer is a finding. |
| No undeclared function writes a single-writer state | *□P* (safety) | The lint scans for writes to the owned state outside the declared `Writer`; a second writer fails the build. |
| Every exemption carries a rationale | *□P* (safety) | A closed set of exempt rationales; an unexplained exemption fails the coverage lint. |

**(e) Derivation direction.** *Model-from-code.* The coverage lint scans the real mutation sites and requires
each owned state to have one declared writer, so the code is ground truth and the registry is the checked view.
The join key is the owned-state identity, which indexes both the `OwnedState` record and its mutation sites.

*Field note.* This one cost a day of chasing a corrupted registry file before the cause showed itself: two
"safely rationed" writers were the whole problem. The semaphore was doing its job — capping load — and
guarding nothing that mattered, because the bug was ownership, not contention.
