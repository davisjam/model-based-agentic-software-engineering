Modeling and Alignment are distinct activities. A model may reduce reconstruction, expose
dependencies, preserve intent, or support prediction while remaining advisory. Alignment begins when
a represented obligation receives authority through a deterministic mechanism.

Table C.7-1 maps each representation to the obligation it exposes, a correspondence mechanism that
can evaluate it, and the authority that may attach.

<!-- table: From representation to possible authority. Each row identifies a represented obligation, a correspondence mechanism that can evaluate it, and the authority that may attach. [short: Representation to authority receipt] -->
| Representation | Obligation exposed | Correspondence mechanism | Possible authoritative mechanism |
|---|---|---|---|
| Component / zone | Each surface has one owner; boundaries use sanctioned seams | Reverse-map the tree and dependency edges | Boundary lint or admission gate |
| Service flow | Only declared service and resource edges are legal | Call and configuration parity | Policy or build gate |
| Lifecycle | Only legal transitions occur | Transition-site reconciliation | Transition primitive or invariant check |
| Ownership | Active work has a valid owner | Runtime ownership checks | Lease, compare-and-swap, or transition mechanism |
| Execution | Placement and scheduling follow declared policy | Deployment and profile reconciliation | Deployment or scheduler gate |
| Measurement | Observed quantity stays within a declared bound | Sensor plus bound evaluation | Warning or admission gate |
| Provenance | Actions leave the required structured record | Record and artifact validation | Completion gate |
| Joined scenario | Cross-view obligations agree | Identity joins across views | Composed check or gate where decidable |

The correspondence mechanisms in the third column compare represented intent with implementation or
runtime evidence. Where the property warrants enforcement, the resulting finding can feed a
deterministic gate. The handoff from Modeling to Alignment is:

```
        MODELING                         ALIGNMENT
  make knowledge explicit   →   give selected obligations authority

   represented obligation      →   authoritative mechanism
    "what is / ought?"            "must this hold?"
```

Models create surfaces on which Alignment can act. Alignment determines which represented obligations
deserve authority, where the relevant evidence can be observed, and which deterministic mechanism
should enforce them.
