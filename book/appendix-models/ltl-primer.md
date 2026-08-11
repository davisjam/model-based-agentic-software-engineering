The Part-II chapter *Modeling Behavior and Execution* teaches the formal vocabulary its models use — a
state machine, an invariant as *□P* or *P ↝ Q*, and a bounded exhaustive walk. This page carries the rest:
the two temporal operators those models do not lean on, and the edge cases a reader who wants the full
picture will ask about. Nothing here is needed to read the mainline; it is the lookup for the curious
engineer who wants the ground under the shorthand.

## Automata, in a little more depth

An **automaton** (**state machine**) is a finite set of states and the labeled transitions between them. It
models computation as *which state am I in, and which moves are legal from here.* The mainline's leased-job
example — *queued → leased → running → reclaimed* — is the whole shape: states are nodes, legal moves are
edges, and an **illegal state** is one the diagram never draws an edge into. A **missing transition** is a
move the code performs that the diagram forbids; a **reachable illegal state** is the bug. Drawing the
machine makes both visible before the code runs: a path back to *running* from *reclaimed* is a
double-execution bug you can see on paper.

A behavior invariant attaches to the machine as a predicate. A *state* invariant is evaluated at each node
(*"a leased job has exactly one owner"*). A *sequence* invariant is evaluated over a run — a path the system
walks, one state after another.

## The four LTL operators — and which two this book uses

**Temporal logic** (LTL) adds operators over *runs* to ordinary predicate logic. Each describes the shape of
a run; the formal semantics matter when you choose a checker.

- **Always — □P.** P holds at every step of every run: nothing bad ever slips through. **Used in the book** —
  every mainline invariant table is a *□P* safety property.
- **Leads-to — P ↝ Q.** Every step where P holds is followed by a later step where Q holds. **Used in the
  book** — the one liveness claim the models make ("a preempted job eventually re-runs"; "a completed
  worktree eventually tombstones").
- **Eventually — ◇P.** Some step of the run satisfies P: the good thing arrives, sooner or later. *Not used
  in the mainline.* It is the degenerate liveness shape (leads-to with a trivially-true antecedent); the
  book's liveness claims all name a triggering condition, so they read more precisely as ↝.
- **Until — P U Q.** P holds at every step until a step where Q becomes true, and Q does become true. *Not
  used in the mainline.* It expresses a phased hand-off ("hold the lease *until* the ack"); the book's models
  express the same obligations as a safety invariant over the state machine plus a leads-to, which route to
  cheaper checkers.

The rule the book follows: teach an operator where a model uses it. *◇* and *Until* are here for
completeness, not because a Part-II invariant needs them.

## Safety versus liveness, and the routing it justifies

Two shapes cover most invariants, and the shape **derives the checker**.

- **Safety — commonly *□P*.** *A bad thing never happens.* Settled by a state-space search for any reachable
  state that violates the predicate. This is the shape every mainline invariant table declares.
- **Liveness — commonly *P ↝ Q*.** *A good thing eventually happens.* No single state settles it; a temporal
  model checker reasons about the cyclic behaviors a run can fall into (an infinite stall that never reaches
  Q is the counterexample).

The theory that a trace property decomposes into a safety part and a liveness part is Baier & Katoen
[cite: baier-katoen2008]; the book uses only the routing it justifies. Declare the shape wrong — route a
liveness property to a safety runtime — and the runtime structurally cannot observe the violation and reports
green. That is why the shape is itself checked: a lint asserts the declared temporal form matches the routed
checker (see the *formal invariant verification* reference page).

## What a bounded model check does and does not establish

A test **samples** the input space: it runs the cases you thought of and sails past the adversarial schedule
you did not. **Model checking** instead **exhaustively explores** the state space — every reachable state, or
every interleaving of a concurrent system — and either shows the invariant holds across all of them or hands
you a concrete **counterexample trace**, the exact sequence of steps that reaches the bad state.

**Bounded** model checking does this to a fixed depth *k*: it checks every behavior up to *k* steps. Read the
result precisely:

- A clean bounded check establishes **no reachable violation within *k* steps under this model and encoding.**
- It does **not** prove the property for all depths — a bug that needs *k+1* steps is out of scope.
- It does **not** cover behavior the model abstracts away — an omitted interleaving cannot be checked.

That honest limit is the price of a decidable check. For a fleet of concurrent agents it is still the right
tool: a distributed race has failure traces no hand-picked example hits, and only an exhaustive walk of the
interleavings finds them. A green sampled test over such a race means far less than a clean bounded check.
