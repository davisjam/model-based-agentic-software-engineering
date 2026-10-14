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

---

## [SCHEDULED] The degrees-of-freedom thread — a joined multi-chapter edit

Author brief captured verbatim at `book/_design/degrees-of-freedom-thread-261013.md` (261013).
**Scheduled, not started: it edits §6.1.6 and §7.3.2/§7.3.3, which have unlanded branches in
review.** Start only after `ch6-topicseq` and `ch7-stageb` land, or it will conflict with both.

The thread's claim: MAGE's economic argument has two distinct sources of leverage — **amortization**
(a structure avoids repeated reconstruction across realizations) and **delegated exploration** (a
purposeful reduction leaves an acceptable region commodity intelligence can search). An elaborate
specification can deliver the first while sacrificing the second. *"The purpose of engineering
structure is not to eliminate freedom. It is to make consequential freedom governable."*

Six edits, in the author's intended reading order:

1. **Preface, after the not-ceding-authority paragraph** — engineering does not run out of work.
   Use the REVISED wording (the brief's §1), which replaces an earlier draft: engineering
   *reorganizes* and engineers move to new levels of abstraction. The author's note: *"engineers will
   be doing OTHER things — turtles all the way down."* The superseded draft implied engineers become
   custodians; do not use it.
2. **Preface, "Why MAGE? Why Models?"** — extend the existing paragraph beginning "The purpose of
   this indirection is not to specify every implementation decision" rather than adding a new one.
   Lands the falsifiable claim: if the models and controls merely reproduce the whole implementation,
   the indirection has accomplished little.
3. **Chapter 1, near the first Modeling/Alignment explanation** — make the freedom tangible and
   concrete (ten lines or ten thousand; monolith or microservices; different algorithms, data
   structures, architectures). Then the qualifier that stops it reading as indiscriminate delegation:
   *"Which choices can safely remain open is itself an engineering decision."*
4. **Chapter 6 §6.1.6, near the representation economics** — the qualification the author moved here
   from Chapter 7: complete specification is sometimes the right engineering choice, but where
   multiple realizations satisfy the obligations, specifying every decision sacrifices the delegation
   advantage. **Refine an existing paragraph; do not create a subsection.**
5. **Chapter 7 §7.3.2, before "The software case was therefore a fortuitous place"** — the SHORT
   analytical callback (brief §2), not the longer §4 draft it supersedes. Software is favorable
   because it combines realization freedom with controlled-change machinery; other domains may have
   equally rich representations but fewer delegable, independently evaluable choices.
6. **Chapter 7 §7.3.3** — one sentence tying the accounting/law contrast to delegable freedom under
   adequate evaluation.

Also **check** (not necessarily edit): does Chapter 6's theory recognize the *value of preserving*
degrees of freedom, or does it treat Modeling and Alignment solely as error- and cost-reduction? The
author flagged this as the thread's deepest implication.

Constraints the author set: **no new named principle, no new terminology, no new figure or equation**
(the book already has degrees of freedom, purposeful reduction, tolerances, engineering economics);
no mathematical construct in Chapter 7 — the economics belong in Chapter 6; leave §7.3.5 alone; do
not claim a complete specification means MAGE failed; do not say legal work reduces to prompting.
Chapter 7's callback must advance the idea, not repeat Chapter 1's examples.

## [FIX] Conclusion heading: rename to match its first-person body

`## The question we asked` now sits above "In the Preface, **I** asked" after the first-person pass.
**Author ruled: rename.** Verified safe — `the-question-we-asked` has **no authored references**
(no `{{sec:}}`, `[ref:]`, or prose mention); it appears only in three DERIVED files
(`reverse_index.json`, `outline.json`, `models-view.html`), which regenerate through their
generators. So: edit the heading, re-derive, commit together. Do it on the `conclusion-rewrite`
branch once its gate clears.
