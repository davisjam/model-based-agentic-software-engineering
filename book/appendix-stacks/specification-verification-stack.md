*A two-page synthesis of the Assurance stack. Six patterns turn a concurrent behavioral
spec into checked assurance: model the lifecycle as composed state machines, derive every obligation from it,
discharge each at the rigor its shape demands, then map coverage back onto the model so an unexercised
invariant is a visible gap, not a guess.*

## The capability

Ask a hard question of a concurrent system: how much assurance do you actually have that it is correct — and
could you say where the assurance runs out? Usually the honest answer is "some, somewhere," which is no
answer at all.

**Say what "correct" means for a concurrent system, derive every check that correctness owes, and prove each
one at the right rigor.** Two capabilities run through it: *establish completion on re-derived evidence*
and *constrain where and how agents act*. It models the lifecycle as state machines running at once, names
the predicates that must hold across them, and routes each to a checker by its shape — an exhaustive proof
for a hairy safety or liveness invariant, a deterministic lint for a linear one. Then it projects coverage
back onto the model, so a verified-in-principle invariant with no live test is a named hole.

### Symptoms you need this stack

You are probably feeling one of these:

- "Correct" for your concurrent system is nowhere written down, so no one can say when it has been violated.
- A concurrency bug ships proven-absent because the one interleaving that breaks it was never sampled.
- Coverage reads 80% and everyone relaxes while a critical invariant sits at zero covering tests.
- The same mistake keeps re-entering through review, because a convention decays under a fleet.

### When to adopt this stack

Use this stack when:

- correctness spans concurrent components, with safety or liveness invariants that must hold across them
- you need each correctness obligation discharged at the rigor its shape demands — a proof for the hairy ones, a lint for the linear ones

Typical domains:

- concurrent job pipelines
- distributed systems with safety and liveness invariants
- workflow and state-machine engines
- safety-critical concurrent software

## Failure classes it covers

- **The unnamed invariant.** Concurrency correctness lives as scattered ad-hoc guards; the predicates that
  must hold across components are never named, so no one can say what "correct" even means.
- **The invisible obligation.** Coverage is a percentage over the lines someone happened to test; a whole
  untested seam or failure edge is invisible because nothing knows it was owed a test.
- **The unsampled interleaving.** A concurrency invariant is "tested" by a unit test that walks a handful of
  interleavings; the one that violates it is never sampled, and the bug ships proven-absent.
- **The convention that decays.** A recurring mistake keeps re-entering through review; a convention says
  "don't do that," but a convention decays under a fleet and the class re-appears one commit at a time.
- **The check aimed wrong.** A lint one level too low passes a spec-legal variation it should catch and fires
  on a legal one it should allow — present but wrong.
- **The comfortable average.** Line coverage reads 80% and everyone relaxes; a critical invariant sits at
  zero covering tests, invisible because the percentage averages it away.

## Composition

<!-- label: specification-verification-stack -->
<!-- figure: assets/specification-verification-stack.svg | The Assurance stack in one picture. Six parts run left to right. The spec (violet): SPEC models the lifecycle as composed state machines and names the cross-machine invariants; CENSUS derives every obligation owed. The rigor tiers: PROVE (green) discharges the hairy invariants with an exhaustive check routed by each invariant's temporal form; LINT (blue) discharges the linear ones with a blocking semantic check at commit, and LEVEL (blue) aims each check at the granularity where its property first becomes legible. COVER (accent) projects coverage back onto the model's nodes, so a verified-in-principle invariant with no live test is a visible gap. -->

Two parts build and read the spec; three discharge the obligations at graded rigor; one maps coverage back.
The spec is the single source every later part reads.

## The constituent parts

The spec is the anchor every later part reads: name the invariants, derive the tests owed, discharge each at
the rigor its shape demands — an exhaustive proof for a hairy predicate, a deterministic lint for a linear
one — place each check where its property is legible, then project coverage back onto the model's own nodes.

### SPEC — model the concurrent lifecycle and name its invariants {#a-3-composed-state-machine-model}

**Say what "correct" means.** Model the concurrent lifecycle as state machines that run at once, and name
the predicates that must hold across them as first-class invariants. (SPEC.)

**Receives** — the system's concurrent behavior: the job lifecycles, the worker and coordinator states, the
transitions that today live as scattered ad-hoc guards. Nothing precedes it.

**Guarantees** — a named, checkable definition of "correct." Each cross-machine predicate becomes an
invariant, and each invariant's shape assigns its verification obligation: a safety predicate earns an
exhaustive state-space check, a liveness one a temporal check, a linear one a property test. Concurrency
correctness is stated, no longer assumed.

**Hands to CENSUS** — the invariants and seams every later part reads. The census turns its invariants into
an obligation set, the prover reads their temporal form to pick a checker, the coverage map projects tests
back onto these same nodes. The spec is only as honest as the parity gate that keeps it equal to the running
code, so it leans on the model-coherence stack beneath it.

→ **Deeper treatment:** role:composed-state-machine-model.

### CENSUS — derive what should be tested, lint the gap {#a-3-model-derived-test-obligation-census}

**Derive every check you owe.** From the model, derive the set of things that should be tested — every
external seam to fuzz, every failure edge to inject, every invariant to check — then lint the gap. (CENSUS.)

**Receives** — the SPEC's invariants and seams, walked as typed data rather than recalled from memory.

**Guarantees** — a named backlog of test obligations, and a lint on the distance between it and the tests
that exist. Coverage stops being a percentage over the lines someone happened to test. An untested seam or
unguarded failure edge is no longer invisible; the model knows it was owed a test, and the gap reddens.

**Hands to PROVE and LINT** — an explicit obligation set for the two rigor tiers to discharge. "What still
needs verifying" becomes a query over the model, not a memory. It hands the prover the hairy invariants and
the lints the linear ones, so each tier works against a named backlog instead of whatever the author
remembered to write.

→ **Deeper treatment:** role:model-derived-test-obligation-census.

### PROVE — let temporal form route the exhaustive checker {#a-3-formal-invariant-verification}

**Prove the hairy invariants exhaustively.** Give each invariant a temporal form — safety (`□P`, always) or
liveness (`P ↝ Q`, eventually) — and let that form route the exhaustive checker that verifies it, so the one
violating interleaving is found or ruled out, never sampled past. (PROVE.)

**Receives** — the SPEC's invariants and the CENSUS's obligation set, filtered to the ones whose shape is
hairy enough to demand a proof.

**Guarantees** — an invariant proven by the method its shape demands, not by a sample. A safety predicate is
discharged by an exhaustive state-space model-check; a liveness one by a temporal checker. The one violating
interleaving a sampled unit test would never walk is either found or ruled out, so a concurrency bug cannot
ship proven-absent.

**Hands to LINT** — the linear invariants it does not claim. PROVE takes the hairy predicates and verifies
them exhaustively, leaving the linear ones for the deterministic checks beside it. Its reach is bounded by
how faithfully the SPEC mirrors the code — abstract away the detail that carried the bug and the proof
proves the wrong thing.

→ **Deeper treatment:** role:formal-invariant-verification.

### LINT — reject the recurring violation at commit {#a-3-semantic-lints}

**Reject the recurring violation at commit.** A fleet of blocking semantic checks reads the tool's own
source — banned APIs, silent-catch bans, typed-seam violations — and fails the build on the invariant
violations the compiler and review miss. (LINT.)

**Receives** — the CENSUS's linear obligations and the tool's source structure, read as a parse tree rather
than a regex over surface text.

**Guarantees** — a recurring class of mistake rejected at commit time, not re-caught in review. A convention
decays under a fleet; a blocking structural check does not. It moves a recurring judgment out of the
reviewer's eye and into a deterministic gate that fires on every commit.

**Hands to LEVEL** — checks whose correctness now turns on where they fire. Between PROVE and LINT the
obligation set is covered, each invariant at the rigor its shape demands. But a deterministic check is only
as good as the granularity it targets, so its trustworthiness passes to the next part to secure.

→ **Deeper treatment:** role:semantic-lints.

### LEVEL — fire each check where its property is legible {#a-3-semantic-level-enforcement}

**Check each property where it's legible.** Place each check at the granularity where its invariant first
becomes observable, not at the cheapest or earliest point. (LEVEL.)

**Receives** — the checks LINT defines, each needing a scope at which its invariant is actually observable.

**Guarantees** — a check that fires where its property lives. Aim a lint one level too low and it passes a
spec-legal variation it should catch, while firing on a legal one it should allow: present, but wrong. Aim it
right instead — check model-to-code drift when an agent returns from a multi-commit task, never at a
per-commit hook where the model is legitimately mid-flight — and the check earns trust.

**Hands to COVER** — checks placed where they can be believed. Only once each fires at its invariant's level
is the deterministic tier worth mapping. A check placed a level off fails silently, reading as a false pass
rather than a red gate — the most expensive failure to notice, and the one this part exists to prevent.

→ **Deeper treatment:** role:semantic-level-enforcement.

### COVER — project coverage onto the model's nodes {#a-3-coverage-model-mapping}

**Make "is this tested?" a query.** Project coverage onto the model's own nodes — its states, seams, and
invariants — so an invariant with no covering test is a visible gap, not a guess from a line percentage. (COVER.)

**Receives** — the SPEC's nodes and the tests the census owed and the two tiers discharged, mapped
test-by-test to the model nodes each exercises.

**Guarantees** — every invariant's test status as a query. Line coverage reads 80% and everyone relaxes
while a critical invariant sits at zero covering tests, averaged into invisibility. The map turns the model
into a work-list: an invariant node with no covering test is a visible gap that drives the next test.

**Hands off** — the stack's final guarantee. Of everything the CENSUS owed and PROVE and LINT discharged,
COVER asks which is actually exercised, so a verified-in-principle invariant with no live test becomes a
named gap. It is exactly as complete as the SPEC's node set, which the census keeps honest.

→ **Deeper treatment:** role:coverage-model-mapping.

## A DocAble example, end to end

DocAble's job pipeline is concurrent: a parent job fans out into chunks, each chunk walks its own lifecycle,
and results fan back in. **SPEC** models the parent and chunk lifecycles as composed state machines and names
the cross-machine predicates — for instance, *the fallback file is uploaded to storage before the job row is
marked complete*. **CENSUS** walks those machines and derives the obligation set: the seams to fuzz, the
failure edges to inject, the invariants to check. **PROVE** takes the hairy safety invariant — no crash
interleaving leaves a job marked done with no artifact — and discharges it with an exhaustive state-space
check, not a sampled unit test. **LINT** discharges the linear ones deterministically at commit: a banned
raw call, a silent catch, a mutation that skips the typed seam. **LEVEL** keeps those lints honest — a
model-to-code drift check fires when an agent *returns* from a multi-commit task, never at a per-commit hook
where the model is legitimately mid-flight. **COVER** then asks, of every obligation CENSUS owed and PROVE
and LINT discharged, which is actually exercised — so an invariant verified in principle but with no live
test surfaces as a gap.

## Tradeoffs and adoption order

1. **SPEC first, and it is only as honest as the parity gate that keeps it equal to the running code.**
   Author the machines and the invariants; without them nothing downstream has a spec to read.
2. **CENSUS turns the spec into a work-list.** Cheap, deterministic, re-runs on every change; it makes "what
   still needs verifying" a query, not a memory.
3. **PROVE and LINT split by shape.** Route the hairy invariants to exhaustive proof — its cost grows with
   the state space — and the linear ones to commit-time lints, which are cheap and fire on every commit.
   LEVEL is the judgment that keeps each lint aimed right; misplacement fails silently as a false pass, the
   most expensive failure to notice.
4. **COVER last.** A projection, not a runtime dependency; it keeps the discharged set honest against the
   spec's nodes.

## Why this composition holds

The six parts turn a claim of correctness into checked assurance, and each rests on the one before it.
Nothing can be derived, proved, or measured until the lifecycle is modeled and its invariants named — the
spec is the substrate the rest read. From it the census derives every obligation owed, so a missing test is
a computed gap and not a lucky catch. The two dischargers split by shape: an exhaustive proof for the hairy
safety and liveness invariants, a blocking lint for the linear ones, each aimed at the level where its
property first becomes legible. Then coverage projects back onto the model's own nodes, so a
verified-in-principle invariant with no live test shows up as a hole instead of hiding inside a comfortable
percentage. Drop the spec and there is nothing to derive from; drop the census and the checks test only what
someone thought of; drop the coverage projection and "proven" quietly decays to "proven once, somewhere."
Together they make assurance a quantity you can point at, and point at where it runs out.

## The full treatment

Each constituent links to its full pattern — in this appendix for the flagship members, online for the rest.
The stack sits on the [model-coherence stack](appendix-d-model-coherence-stack.html) (its state machines are
that stack's executable data) and feeds the
[observe → react loop](appendix-d-observe-react-stack.html) (a verified invariant still needs a live signal
when it breaks). The full 85-mechanism catalogue is online in the web edition.
