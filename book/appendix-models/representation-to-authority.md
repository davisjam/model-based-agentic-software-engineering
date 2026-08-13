Modeling and Alignment are related activities, but they are not the same one. A model can improve
reasoning without governing anything: it can reduce reconstruction, expose a dependency, preserve
intent, or make a prediction possible while staying advisory. Alignment begins when an obligation the
model represents is given authority through a deterministic mechanism.

A compact map of this appendix's examples is enough to show the move. Each row reads left to right:
the representation, the obligation it exposes, a correspondence mechanism that could check it, and the
authority that mechanism could carry.

<!-- table: From representation to possible authority — the obligation each model in this appendix exposes, a correspondence mechanism that could check it, and the authority that could attach. Not a maturity ladder. [short: Representation to authority receipt] -->
| Representation | Obligation exposed | Correspondence mechanism | Possible authority |
|---|---|---|---|
| Component / zone | Each surface has one owner; boundaries use sanctioned seams | Reverse-map the tree and dependency edges | Boundary lint or admission gate |
| Service flow | Only declared service and resource edges are legal | Call and configuration parity | Policy or build gate |
| Lifecycle | Only legal transitions occur | Transition-site reconciliation | Transition primitive or invariant check |
| Ownership | Active work has a valid owner | Runtime ownership checks | Lease, compare-and-swap, or transition mechanism |
| Execution | Placement and scheduling follow declared policy | Deployment and profile reconciliation | Deployment or scheduler gate |
| Measurement | Observed quantity stays within a declared bound | Sensor plus bound evaluation | Report, warning, or gate |
| Provenance | Actions leave the required structured record | Record and artifact validation | Completion gate |
| Joined scenario | Cross-view obligations agree | Identity joins across views | Composed validation where decidable |

The correspondence mechanisms in the third column share one enforcing form: a drift-parity gate that
fails the build when a model and the reality it claims disagree, in either direction. This table is
not a maturity ladder, and not every represented property deserves a gate. Its purpose is to show the
one seam the book crosses between Parts II and III:

```
        MODELING                         ALIGNMENT
  make knowledge explicit        decide what deserves authority
            │                                │
            ▼                                ▼
      representation ─────────────► deterministic mechanism
            │                                │
     "what is / ought?"              "must this hold?"
```

Part II's models create surfaces on which Alignment can act. Part III decides which of those surfaces
should become obligations, where they should be sensed, and what mechanism should hold them. That is
the whole handoff.
