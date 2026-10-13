# TODO (internal — not served)

Deferred work items for the catalogue. This file is process, not content; it is excluded from
`catalog.py build` (see `NOSERVE` in `catalog.py`). Get to these **after** the current refactor (the
abstractions-glossary sweep across all families).

---

## 1. Fess up to the single-machine development context (contention framing)

**The fact to disclose.** All development in the case study was done on a **single machine**, deliberately
— that produced *maximal* resource contention (every agent worktree fighting the same CPU, disk, and
build/test toolchain) at *minimal* cost (no cluster to run or pay for). That single-host setup is why
several mechanisms are shaped the way they are — in particular the host-level `flock`/semaphore mediators.

**Why it needs saying.** A reader could mistake the *specific implementation* (host-level file locks on one
box) for the *general mechanism* (declare and mediate contention over shared resources). Contention is
universal to any real engineering shop — the only question is **who arbitrates it**: a single host's kernel
+ `flock`, or ZooKeeper / etcd, or a Kubernetes scheduler, or a CI queue. Our single-machine choice sits at
one extreme of that spectrum; the *pattern* generalizes, the *arbitration substrate* does not.

**What to change (light touch — rephrase, don't rewrite).** Add a sentence or two to the affected entries
distinguishing the general mechanism from our single-host instantiation, and note that a distributed shop
would swap the arbitration substrate while keeping the declare-and-mediate pattern. Candidate entries:

- `agent/mediators-and-resource-locks/` — **test-serializer**, **build-serializer**,
  **aggregate-compute-protection** (the flock/semaphore host mediators — the primary site).
- `models-bridge/system-models/synchronization-model` (the meta-sync `flock`/`lockf` registry).
- `models-bridge/system-models/concurrency-contracts` (the mediator + single-writer contracts).
- Possibly a one-line disclosure on the landing page or the models-bridge README so the framing is set
  once, globally, rather than repeated per entry.

**Acceptance.** A reader from a multi-machine shop reads these entries and understands (a) the mechanism is
about arbitrating contention, (b) our `flock` implementation is the single-host instantiation of it, and
(c) their substrate (ZooKeeper / k8s / etc.) is a drop-in for the arbitration layer. `catalog.py validate`
stays at 0 issues.

---

## [FIX] Node-pin resolution lives in two places — decide whether to unify or declare the split

**State.** Two copies of "read `.nvmrc`, resolve that major's nvm bin directory" now ship:
`tools/land.py:_node_bin()` (raises `SystemExit` and refuses to guess) and
`tests/common.py:pinned_node_env()` (returns `None` and preserves the caller's SKIP posture).
A third, different `.nvmrc` reader exists at `book/build_book.py:_MERMAID_NODE_PIN`, which pins a
major for mermaid rather than resolving a bin — related concept, not the same logic.

**Why the second copy landed anyway (261013).** The repo rule is extract on the second site, and
this is the second site. It was not extracted because `tools/land.py` is the lander: it must run
when the test package is broken, which is exactly when someone reaches for it, so it stays
stdlib-only and free of repo imports. Importing `tests.common` would couple recovery to the thing
being recovered. The two also differ in failure posture by design — the lander must refuse, a
Tier-2 check must degrade to SKIP — so a shared helper needs both behaviours parameterised.

**The decision to make.** Either (a) accept the split and hold it with a comment in each site naming
the other (done today) plus a note here, or (b) extract to a tiny stdlib-only module both import —
which costs `land.py` its import-freedom, and should only happen if a third true consumer appears.

**Do not let it drift silently.** The failure this prevents is real: on 261013 PATH held node v20.17
against a pinned v24, `fs.globSync` does not exist before v22, and html-validate died — the check
reported SKIP, so the HTML validator had quietly stopped validating locally while CI stayed green.
A divergence between these two resolvers would reintroduce exactly that class on one surface only.

**Acceptance.** Either this item is closed with a recorded decision for (a), or (b) lands with both
call sites migrated and no delegating shim.
