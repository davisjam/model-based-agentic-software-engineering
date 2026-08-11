The mediator registry is the *how-many* half of concurrent-write safety. It declares which heavy or
shared-resource invocations must run through a serializer, and at what concurrency cap. This page gives its
five-field detail.

**(a) Quality property.** **Mediation coverage** — *does every invocation of a mediated class actually reach
its serializer?* The enforcer can only guard a call that reaches it, so a newly-added raw call that skips the
serializer is invisible to it. The failure it settles is **resource contention**: too many heavy processes on
one box, trampling each other. The coverage lint closes the blind spot — an unmediated call to a mediated
class fails the build at author time rather than surfacing as a host-trampling race in production.

**(b) Structure.** A record per mediated resource, keyed by the invocation it guards.

- **`MediatedResource`** — one heavy or shared invocation that must be serialized: the test runner, the build
  tool, a whole-repo lint mutex.
- **The cap** — the concurrency ceiling the serializer enforces: 1 for a mutex, M for a semaphore.
- **The serializer seam** — the single entry point every invocation of the resource must route through; the
  coverage lint checks that no call bypasses it.

**(c) Representative figure.** A funnel: many call sites converge on one serializer seam that admits at most
*cap* concurrent runs; a call site drawn bypassing the seam is the coverage violation.

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| Every call to a mediated resource routes through its serializer | *□P* (safety) | Coverage lint scans call sites of each `MediatedResource`; a direct call that skips the seam is a finding. |
| Each mediated resource declares its concurrency cap | *□P* (safety) | The registry requires a cap per resource; a mediated resource with no declared cap fails the build. |
| Every exemption carries a rationale | *□P* (safety) | A closed set of exempt rationales; an unexplained bypass fails the coverage lint. |

**(e) Derivation direction.** *Model-from-code.* The coverage lint reads the real call sites and requires each
to reach the serializer, so the code is ground truth and the registry is the checked view. The join key is the
mediated-resource identity, which indexes both the `MediatedResource` record and the call sites that must
route through its seam.

*Distinction from the single-writer registry.* A mediator bounds **contention** (how many run at once); the
single-writer registry bounds **ownership** (who may write). A cap of two admits two racing writers — within
cap, still a torn write — so the two registries settle different failure classes and neither substitutes for
the other.
