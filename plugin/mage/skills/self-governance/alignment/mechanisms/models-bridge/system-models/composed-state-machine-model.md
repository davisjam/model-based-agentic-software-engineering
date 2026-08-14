# Composed state-machine model (typed lifecycles + cross-machine invariants)

**Intent** — Model a concurrent lifecycle as a *set* of typed state machines that run at once, name the
predicates that must hold **across** those machines as first-class invariants, and **derive each
invariant's verification obligation from its shape** — a safety predicate earns an exhaustive
state-space check, a liveness predicate a temporal one, a linear predicate a property test. The
concurrency structure stops being implicit in scattered status flags and becomes one checkable object
(our instance: a handful of job/chunk/parent lifecycle machines with a dozen-plus cross-service
invariants, each routed to its checker by its declared temporal form).

| | |
|---|---|
| Summary | Typed state machines + cross-machine invariants, each routed to its checker by its shape. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — typed machines *held true* by a drift gate (declared states reconciled against the live lifecycle), and every cross-machine invariant carries a temporal form that *derives* which checker verifies it |
| Derivation | `both` — the machines are reconciled against the live lifecycle (from-code), and each invariant's verification obligation is generated from its temporal shape (to-code) |

*Its place in the environment — the **canonical mechanism** for **KNOW · Maintain authoritative system knowledge**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know).*

## Motivation — the failure it kills

A distributed lifecycle rarely lives in one machine. A parent job fans out into chunks; each chunk moves
through its own states; a completer fans the results back in. The **correctness properties that matter
span the machines**: a chunk is never both leased and free, a preempted chunk eventually re-runs, the
output is uploaded *before* the row is marked done, exactly one completer fires. Left implicit, each of
those lives as a scatter of boolean flags and status columns mutated from many call sites, and the
cross-machine predicate is asserted **nowhere**. The failures are the worst kind: a rare interleaving
double-completes a job, a crash between upload and commit strands a corrupt output as "done," a
requeue races a terminal write. None of these show up in a single-state read of any one machine, so a
test suite that walks each machine alone reports green while the composition is broken.

## Why it's not just the verifier that checks it

A separate mechanism **proves** invariants: it reads an invariant's temporal form and runs the exhaustive
checker that form demands. That mechanism is the *verifier*, and it is deliberately subject-agnostic — it
does not care what the invariants are *about*. This entry is the **thing it verifies**: the authored
object that declares *which* machines exist, *how* they compose, and *what* must hold across them. The
verifier answers "is this stated invariant true across every interleaving?"; the model answers "what are
the machines, what are their legal transitions, and what are the cross-machine predicates worth
stating?" One is the proof engine, the other the specification the engine runs against — a model with no
verifier is unchecked prose, and a verifier with no model has nothing to check. The distinction is the
same as a type system versus the types you write: the checker is general, the declared shapes are yours.

## Mechanism

- **Each lifecycle is one typed machine.** States as an enum, a transition table naming every legal edge,
  a terminal-safe set. An illegal transition is unrepresentable, not a runtime surprise; a state no edge
  reaches is a build finding.
- **The machines are named as a composed set, not a pile.** The model declares the parent, the per-chunk,
  and the fan-in machines together, and the seams where one hands off to another. The composition itself
  is the subject.
- **Cross-machine predicates are first-class invariants.** "Upload precedes the terminal write," "exactly
  one completer," "a preempted chunk re-enters ahead of fresh same-class work" — each is a declared entity
  on the model, not a comment or a hopeful test name.
- **Each invariant declares a temporal form, and the form is consumed.** A safety form (`[]P`) routes the
  invariant to an exhaustive state-space search; a liveness form (`P ~> Q`) to a temporal checker; a
  linear ordering to a property test. The routing is *derived* from the form, so a hairy concurrency
  invariant is forced onto an exhaustive checker while a simple one stays cheap.
- **Held to reality by a drift gate.** The declared states and seams are reconciled against the live
  lifecycle vocabulary on every build; a state the code reaches but the model omits reddens the gate. It
  lands audit-only, then promotes to blocking.

## Prerequisites

- **A real lifecycle enacted through addressable state.** The model reconciles its declared states
  against a live status vocabulary (a status column, an event stream). Without something to reconcile
  against, this is a hand-drawn diagram, not a checked model.
- **A required, consumed temporal-form field on each invariant.** The form's value is that it *routes* the
  checker. Optional or decorative, it rots — an invariant with a form no checker reads only looks verified.
- **At least one exhaustive checker to route to.** The derived obligation buys nothing if a safety
  invariant has no state-space search to run against.
- **The executable-source-of-truth substrate**, so the machines are data the build reads, not code the
  build hopes is right.

## Consequences & costs

- **The lifecycle gains one authoritative source of truth.** A new state or a new cross-machine invariant
  is now a model edit or the drift gate fails. That friction is the freshness guarantee, not an accident.
- **Exhaustive only within the modeled bounds.** A state-space check proves the invariant across the
  *modeled* interleavings; a bug in a dimension the model abstracts away is out of scope. The proof is as
  strong as the model's fidelity, no stronger.
- **The composition is where the effort concentrates.** Drawing each machine alone is easy; the value and
  the cost both live in naming the *cross*-machine predicates, which is exactly the part a single-machine
  view never forces you to state.

## Known uses

- A composed model of a fan-out/fan-in document pipeline: a parent-job machine, a per-chunk machine, and
  a fan-in completer machine, declared together with the seams between them.
- A dozen-plus cross-service invariants (lease-or-free exclusivity, upload-before-terminal-write,
  exactly-one-completer, preemption re-entry order), each a declared entity carrying a temporal form.
- The temporal form as a *required* field that derives the verification tier: safety invariants routed to
  a bounded state-space search, liveness invariants to a temporal model checker, linear ones to property
  tests — so the hardest races are the ones forced onto the strongest checkers.

## Related mechanisms

- **Consumer** — [formal-invariant-verification](formal-invariant-verification.md): the verifier that
  *reads* this model's invariants and proves each by the checker its temporal form demands. This entry is
  the specification; that one is the proof engine. Neither is useful alone.
- **Counterpart** — [process-view](process-view.md): the same concurrency seen from the other question.
  This model asks "what are the machines and what must hold across them?"; the process view asks "what
  runs at once and where do they race?" One projection over one concurrency structure, two views.
- **Sibling** — [agent-orchestration model](agent-orchestration-model.md): the same typed-machines +
  derived-tier-invariants method pointed at the fleet's own lifecycle instead of the product's runtime.
- **Layer** — [concurrency-contracts](concurrency-contracts.md): the single-writer and mediator contracts
  that keep the machines' shared state from being trampled by concurrent writers, one layer beneath the
  machines that transition it.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the reconciliation that keeps the declared
  machines equal to the live lifecycle, the same parity every model here rides on.
