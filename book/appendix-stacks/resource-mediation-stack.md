*A two-page synthesis of the Mediation stack. Four patterns share one machine among dozens of
concurrent agent worktrees without letting them trample each other or drown the host: declare what must be
serialized, hold each declaration with a host-level mediator, and govern the whole with a live pressure
signal.*

## The capability

Eight agents, one machine. How many heavy jobs should run at once — and who decides when the box is already
sliding into swap? Answer "all of them" and it thrashes; answer "one" and a capable host sits idle.

**Run dozens of agent worktrees on one box at the right degree of parallelism — no collisions, no thrash, no
swap.** It serves a single capability — *manage work, state, and resources* — on the resource face. It
declares which work must be
serialized and which may run in parallel, holds each declaration with a host-level lock, and puts a live
pressure signal over the whole that refuses new heavy work before it starts and sheds running work when the
host spikes. The contract says how many; the mediators hold that many; the pressure gate decides whether they
run at all.

Picture the failure the first three parts alone do not catch. A fleet of eight worktrees is running, every
heavy tool correctly behind its lock — the test suite serialized, the builds bounded to a safe count.
Nothing is oversubscribed. Then three builds that were each admitted while the machine was healthy keep
running as a fourth agent's compile loads a large model into memory, and the box tips into swap. Now every
process crawls, the locks are all still held by work that cannot finish, and the fleet has wedged itself —
not by breaking a rule, but by obeying all of them at a moment the host could no longer bear the admitted
load. A fixed cardinality cap counts jobs; it cannot feel the machine. That gap is what the live pressure
signal, the stack's fourth part, exists to close.

### Symptoms you need this stack

You are probably feeling one of these:

- Two worktrees run the heavy test suite at once, saturate the disk, and both come back slow and flaky.
- Who may run what, and how many at once, lives as folklore in scattered wrapper scripts.
- Your heavy tools run one-at-a-time and waste a capable box, or all-at-once and thrash it.
- A correctly-serialized fleet still drives the host into swap under its own admitted load.

### When to adopt this stack

Use this stack when:

- many agents or jobs share one machine and contend for the same heavy resources
- you need parallelism that rises to the machine's capacity and stops there

Typical domains:

- shared build and CI hosts
- multi-agent worktree fleets
- self-hosted runners
- resource-contended shared development environments

## Failure classes it covers

- **The undeclared contention.** Who may run a thing, and how many at once, lives as folklore in scattered
  wrapper scripts; a new call site oversubscribes a resource no one knew was contended.
- **The colliding monopoly.** Two worktrees run the heavy test suite at once on one machine; they saturate
  I/O and interfere, and both come back slow and flaky.
- **The mismatched cap.** Heavy builds and type-checks run either one-at-a-time — wasting a capable machine —
  or all-at-once, thrashing it; neither matches the host's actual capacity.
- **The self-inflicted swap.** Even a correctly-serialized fleet drives the host into swap: work admitted
  while the machine was healthy keeps running as pressure climbs, and the box wedges under its own load.

## Composition

<!-- label: resource-mediation-stack -->
<!-- figure: assets/resource-mediation-stack.svg | The Mediation stack in one picture. Four parts run left to right. DECLARE (violet) is the typed registry of concurrency contracts — what is serialized, what is single-writer. SERIALIZE (blue) is the host-level flock that admits one run of the heaviest tool at a time (N=1). SEMAPHORE (green) is the counting lock that admits up to eight concurrent runs of the adjacent heavy tools (M=8). SHED (accent) governs a saturable resource with a live pressure signal at two layers — an admission gate that refuses heavy work before dispatch and an execution shed that stops running work on a spike. The contract says how many; the mediators hold that many; the pressure gate decides whether they run at all. -->

One part declares the contracts; two enforce them at fixed cardinality — a strict monopoly and a bounded
pool; one adds a live signal over both.

## The constituent parts

Four parts run as a chain: a typed registry names the contracts, a serializer enforces the strictest of them,
a semaphore enforces the bounded-sharing ones, and a pressure gate bounds whether any of them should run at
all, given the host's live state. Declared cardinality holds the count; the live signal holds the condition.

### DECLARE — the concurrency-contract registry {#a-5-concurrency-contracts}

**Declare what must be serialized.** A typed registry names each of the system's concurrency contracts —
which subprocess invocations are serialized by a mediator, and which state-mutating functions are
single-writer — so "how many at once" becomes data a check enforces. (DECLARE.)

**Receives** — the system's contended operations: the heavy test runner, the build tools, the state mutators
several worktrees might touch at once. Undeclared, who-may-run-what lives as folklore in scattered wrapper
scripts.

**Guarantees** — a declared, coverage-checked contract set. Each entry names its mediator and its
cardinality, so a newly-added subprocess or mutator that should be contracted but isn't becomes a
coverage-lint failure, not a race discovered late. The declaration is the model side the enforcers act
against — an enforcer only ever sees the calls that reach it.

**Hands to SERIALIZE and SEMAPHORE** — the cardinalities the mediators read. The serializer looks up the
single-writer contracts, the semaphore the bounded-sharing ones; both take their degree from this one
registry rather than from a convention a new call site can quietly miss.

→ **Deeper treatment:** role:concurrency-contracts.

### SERIALIZE — the single-writer test lock {#a-5-test-serializer}

**Hold the strictest contract to one writer.** A host-level flock admits a single run of the heaviest,
mutually-destructive tool, so concurrent worktrees queue instead of colliding. (SERIALIZE.)

**Receives** — the single-writer contracts from DECLARE, and every attempt to run the heavy tool. The
canonical case is a test runner: several worktrees running it at once saturate CPU, disk, and ports.

**Guarantees** — one run at a time on the contended resource. An exclusive flock admits a single caller; the
second waits. Decisively, an enforcer inside the tool makes the un-mediated path impossible — a raw
invocation from an agent worktree is refused, so the serialization is real rather than a convention agents
forget under pressure. A wait cap fails loud, so a stuck lock surfaces instead of hanging forever.

**Hands to SEMAPHORE** — the sibling case. The resource that cannot share takes this flock; the resources
that can share take the counting lock beside it — same registry, different cardinality, chosen by the
resource's contention profile.

→ **Deeper treatment:** role:test-serializer.

### SEMAPHORE — the bounded build semaphore {#a-5-build-serializer}

**Share up to capacity, then wait.** A host-level counting semaphore admits a fixed number of concurrent
runs of the adjacent heavy-compute tools, so worktrees get parallelism up to the machine's capacity without
oversubscribing it. (SEMAPHORE.)

**Receives** — the bounded-sharing contracts from DECLARE, and every call to the heavy but parallel-safe
tools: the compiler, the type-checker, the code-query and lint tools.

**Guarantees** — parallelism that rises to capacity and stops there. These tools are numerous and mostly
parallel-safe, so single-writer would waste cores while all-at-once would thrash the host; a counting
semaphore admits its bound and makes the next caller wait. A per-tool enforcer on each keeps the mediated
path the only path. The bound is a tuned guess per machine — too low wastes a big host, too high thrashes a
small one.

**Hands to SHED** — a fixed ceiling a live signal can override. The semaphore bounds how many run; the
pressure gate downstream bounds whether they should run at all, and catches the thrash a static bound cannot
foresee.

→ **Deeper treatment:** role:build-serializer.

### SHED — the live-pressure gate {#a-5-resource-pressure-gating}

**Refuse and shed heavy work under pressure.** A live pressure signal governs a saturable host resource at
two layers — an admission gate that refuses or defers heavy work before dispatch, and an execution shed that
stops heavy work already running when pressure spikes. (SHED.)

**Receives** — the host's live pressure over the saturable resource (load, memory), plus the heavy work the
fixed-cardinality mediators would otherwise admit regardless of the machine's current state.

**Guarantees** — heavy work neither started into an overloaded host nor left running on one. A cardinality
cap bounds how many jobs run, not whether the host can bear them right now. One coarse signal drives both
layers: admission refuses before the cost of starting doomed work is paid, and shedding catches pressure
that rose after a job was admitted. One shared signal keeps the two from disagreeing; the same reading is
callable, so the operator can consult it for dispatch judgment too.

**Hands off** — the stack's final bound. Where DECLARE, SERIALIZE, and SEMAPHORE fix how many may run, this
decides whether they should run at all — the admission-and-shedding layer over the fixed-cardinality
mediators beneath it.

→ **Deeper treatment:** role:resource-pressure-gating.

## A DocAble example, end to end

DocAble's development runs six to eight agent worktrees on one shared build machine. **DECLARE** names each
contended invocation in a typed registry — the C# test runner is serialized, the build and type-check tools
share up to a fixed count, this in-memory mutation is single-writer. **SERIALIZE** holds the strictest of
those: the heavy test suite takes an exclusive flock, so when two agents reach it at once the second waits
instead of colliding on I/O — both runs come back fast and clean rather than slow and flaky. **SEMAPHORE**
holds the looser contracts: up to eight concurrent builds and type-checks run, and the ninth waits, so the
machine runs at capacity and stops there. Over all of it, **SHED** watches host pressure — when memory
climbs toward swap it refuses to admit the next heavy job, and if a running wave spikes the box it sheds
work already in flight, so a correctly-serialized fleet still cannot drive the host into the ground.

## Tradeoffs and adoption order

1. **DECLARE first.** Without the contract registry the mediators do not know what to serialize or to what
   degree. Its cost is authoring the contracts; an undeclared contended invocation is the gap, which the
   mediators' own coverage check surfaces.
2. **SERIALIZE and SEMAPHORE together.** Same registry, two cardinalities — the resource that cannot share
   takes the flock (N=1), the ones that can share take the counting lock (M>1). The serializer costs
   latency on the monopoly resource; the semaphore needs a tuned M per machine and degrades gracefully.
3. **SHED last, and it earns its place under load.** A live-signal gate adapts where a fixed cap cannot. It
   fails only if the signal lags the real pressure, so read the saturating resource as directly as possible.

## Why this composition holds

The four parts answer one question — how many may run — at descending levels of trust. The contract declares
which work is serialized and which may share, so the mediators below hold a typed rule instead of folklore.
The single-writer lock and the counting semaphore hold exactly those declarations: one resource pinned to a
single writer, the shareable ones bounded to a tuned count. But a fixed cap counts jobs and cannot feel the
machine, so the live pressure gate sits over all of them, refusing new heavy work before it starts and
shedding running work when the host spikes — catching the self-inflicted swap the cardinality caps admit.
Drop the contract and the locks guard the wrong things; drop the pressure gate and a correctly-serialized
fleet still wedges itself under its own admitted load. Counting is necessary and never sufficient; the
machine has the final say.

## The full treatment

Each constituent links to its full pattern — in this appendix for the flagship members, online for the rest.
The stack pairs with the [observe → react loop](appendix-d-observe-react-stack.html) (the pressure signal
rides the same observability surface) and the
[Briefing stack](appendix-d-context-management-stack.html) (both share one machine among many
agents). The full 85-mechanism catalogue is online in the web edition.
