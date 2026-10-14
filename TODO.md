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

---

## [FIX] Hypothesis count: the model says 9, three sites say 7

**Authoritative:** `book-models/theory_of_mage_declared.json` carries **9 hypotheses**
(H1-H9) + **2 sub-hypotheses**. `theory_of_mage_model.py:52` agrees (`EXPECT_HYPOTHESES = 9`).

**Stale sites saying seven:**
- `book-models/substantiation.py:7` — module docstring, "the seven hypotheses H1-H7"
- `book-models/substantiation.py:162` — `_theory_claims` docstring, same phrasing
- `book-models/outcomes_declared.json:366` — a learning-outcome STATEMENT; regenerates
  `outcomes.json:826`, so fix the declared file and re-derive, never the derived one

**Not a functional bug.** `_theory_claims` iterates `m.get("hypotheses", [])`, so it already
handles all nine; the count guard is correct. Author's read: *"The passing test is not itself
evidence of a problem, but misleading diagnostics will complicate future maintenance."*

Author directed this be corrected **separately** from the ch6 prose landing.

## [FIX] F-2: ch3 §3.2 repeats ch2's computation-model explanation

Chapter 2 owns the full explanation of the generate-direction correspondence; §3.2 should invoke
that result and proceed to its enforcement implications. Author: *"a good application of
progressive disclosure: introduce, develop, then reuse."* Approved as a targeted ch3 correction.

## [PROCESS] Prose settled — stop broad style passes

Chapters 1, 2 and 6 are now author-declared settled. Remaining editorial work is **technical
correctness, reader comprehension, and consistency with the rest of the book** — not another
generalized style sweep. Author on all three: *"Another broad style pass: not recommended."*

## [PROCESS] Mechanical thresholds are DETECTORS, not definitions of good prose

Author's caution (ch1 review): be wary of turning corrective-figure counts and duplicate-8-gram
checks into hard stylistic rules. They locate candidates; they do not adjudicate quality. The
audit playbook's mechanical pre-pass should stay framed that way — worth a wording check in
`plugin/mage/skills/self-communicate/writing/audit.md`.

## Author rulings worth not re-deriving
- The "Claude is the fastest road to hell" quotation lives in **1.1 only** — ch1 owns the voice and
  the hook. Its 5.2 duplicate is removed and the interpretation promoted to prose.
- **D-6 retained:** "Enforcement goes further by preventing violations" stays unqualified. Within a
  control's declared scope, enforcement can prevent; the book already separates what a mechanism
  guarantees from what lies outside its coverage.
- **§6.1's size is not a defect**, and §6.1.6's length is not a reason to compress the
  determinization frontier.
- **Mathematical repetition is not prose repetition** — the Master Equation's repeat appearances stay.
