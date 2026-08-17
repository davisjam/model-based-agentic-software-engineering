<!-- note-spread: 1 -->

**Intent** — Model a concurrent lifecycle as a *set* of structured state machines running at once, their
cross-machine predicates declared as first-class, shape-verified invariants.

<!-- note-fold -->

## Problem

A distributed lifecycle rarely lives in one machine: a parent job fans out into chunks, each moves through
its own states, and a completer fans the results back in. The properties that matter span the machines — a
chunk is never both leased and free, output is uploaded before the row is marked done, exactly one completer
fires. Left implicit, each is a scatter of boolean flags asserted nowhere, and the failures are the worst
kind: a rare interleaving double-completes a job, a crash between upload and commit strands a corrupt output
as "done." A suite that walks each machine alone reports green while the composition is broken.

## Mechanism

- **Each lifecycle is one structured machine** — states as an enum, a transition table of legal edges, a
  terminal-safe set; an illegal transition is unrepresentable, a state no edge reaches a build finding.
- **The machines are named as a composed set** — the model declares the parent, per-chunk, and fan-in
  machines with their hand-off seams; the composition is the subject.
- **Cross-machine predicates are first-class invariants** — declared entities on the model, not comments or
  hopeful test names.
- **Each invariant declares a consumed temporal form,** routing safety to an exhaustive state-space search,
  liveness to a temporal checker, a linear ordering to a property test — so a hairy concurrency invariant is
  forced onto the strongest checker.
- **A drift gate holds it to reality,** reconciling the declared states against the live lifecycle vocabulary
  on every build; it lands audit-only, then promotes to blocking.

## Engineering Consequences

The lifecycle gains one authoritative source of truth: a new state or invariant is a model edit or the drift
gate fails, and that friction is the freshness guarantee. The effort concentrates on naming the cross-machine
predicates, the part a single-machine view never forces you to state.

## Implementation Seam

The model sits on the executable-source-of-truth substrate [appendix: executable-source-of-truth], so the
machines are data the build reads; each invariant carries a required, consumed temporal-form field; and at
least one exhaustive checker must exist to route to. A separate verifier reads the invariants and runs the
checker each form demands — this entry specifies, that one proves, neither useful alone.

## Known Limitations

A form no checker reads only looks verified, so the field must stay required and consumed. The check proves
invariants across the modeled interleavings only; a bug the model abstracts away is out of scope, so the
proof is only as strong as the model's fidelity. Without a real lifecycle enacted through addressable state to reconcile against, though, this is a
hand-drawn diagram, not a checked model.
