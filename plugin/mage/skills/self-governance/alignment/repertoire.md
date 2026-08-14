# Alignment repertoire — making represented intent consequential

**Owns the question:** *How does intent become authority?* — how a property someone
cares about stops being a hope and starts holding against every later change.

This facet carries most of what the old self-governance skill taught. It is no longer
the whole skill. The old skill made prevent-vs-detect the top of the tree; the rebuilt
skill puts it one level down:

```
   OLD                         NEW
SELF-GOVERNANCE            SELF-GOVERNANCE
      |                          |
prevent / detect            apply MAGE
                                 |
                            +----+----+
                            |         |
                          MODEL     ALIGN
                                      |
                                 prevent / detect
```

Nothing here is lost. The census of concrete mechanisms, the constraint/sensor teaching,
soft-vs-hard, the three targets, the structural forms — all of it lives on, at the level
where it belongs: **one facet beneath the loop**, loaded when the task reaches for a
property that must hold.

Reach here when you have decided *what should be true* and now need it to *stay true*
without a person re-checking it each time.

---

## The four kinds of alignment mechanism

Represented intent acquires authority through four moves. They form an escalation — each
does strictly more than the one before, at strictly more cost.

- **Constraint — restrict what can happen.** Scope the action space so the wrong move
  cannot be picked. A typed enum where a bare string invited synonyms; a single sanctioned
  seam with a ban-lint on the raw path; least-privilege on a capability. A constraint
  **prevents**: the failure never occurs, so nothing has to catch it and no iteration is
  spent. Building constraints is the design activity called **architecture** — not a
  separate kind of thing.
- **Sensor — expose relevant state or an event.** Make something visible that was
  invisible: a structured per-decision log, a metric, an emitted event, a lint that reports.
  A sensor renders no verdict. It surfaces the raw signal a verdict would read. A sensor is
  only as good as its observability — never name one without naming the signal it watches.
- **Validator — decide whether a property holds.** Consume the signal and return a verdict:
  *does property P hold — yes or no?* A test asserting an invariant, a schema check, a
  conformance run, a drift check comparing model to code. The validator is the **assurance
  boundary**: it, not anyone's belief, establishes that the property holds.
- **Gate — condition progression on evidence or authority.** Permit or block the next step
  based on a validator's verdict or on a present authority token. A pre-commit hook that
  refuses a commit while a check is red; a merge-train that fast-forwards only a
  suite-green worktree; a deploy step that will not promote without a passing smoke. The
  gate is where a verdict becomes *consequence* — advancement stops until the property is
  established.

The pipeline reads left to right, and detection is the whole right half:

```
 constraint          sensor  →  validator  →  gate
 (prevent)          (expose)    (decide)    (condition progression)
     |                 └──────────── detect ────────────┘
```

**Constraint prevents; the other three detect.** Prevention removes the possibility.
Detection lets the possibility exist, then catches it — expose it (sensor), judge it
(validator), and stop on the judgment (gate). A failure caught only by a person re-reading
the diff has none of these; a failure caught by a red gate has all three.

### Why the four are not one

The old skill collapsed validator and gate into "sensor" and leaned on the
constraint/sensor pair. That undersells the half where most assurance actually lives. Keep
them distinct because they fail distinctly:

- **A sensor without a validator** emits signal no one reads a verdict from — telemetry
  that proves nothing. You *see* the per-decision log; you never *decide* the property from it.
- **A validator without a gate** renders a verdict that changes nothing — a red test whose
  failure still ships. The property is judged and the judgment is ignored.
- **A gate without a validator** blocks on nothing — a hook that fires but checks no
  property, so it either always passes (theater) or always blocks (a wall).

Each rung earns its cost by doing what the rung below cannot. Name which rung a proposed
mechanism is, and you have named what it does and what it still needs.

---

## Prevent versus detect — the choice within the space

Once you are in this space, the first fork is prevent-vs-detect, and it maps to the
undesirable condition itself:

```
              undesirable condition
                       |
             +---------+---------+
             |                   |
          PREVENT              DETECT
             |                   |
        constraint      sensor → validator → gate
```

**Prefer the constraint where one exists.** Prevention costs no iteration — the wrong state
is unreachable, so there is nothing to catch, re-run, or explain. Detection costs at least
one iteration every time: the failure happens, the sensor exposes it, the validator fails,
the gate stops the work, the work is redone.

**Where the failure is costly, do both.** A constraint that scopes the action space *and* a
validator-plus-gate that catches what the constraint cannot express. Belt-and-suspenders is
a feature, not redundancy, when the cost of one escape is high.

Two situations force detection even when you would prefer prevention:

- **The property is not expressible as a reachable-state restriction.** "The alt text
  actually describes the image" cannot be made structurally impossible to violate; it can
  only be judged after the fact. Validator-plus-gate is the only path.
- **The constraint would over-restrict.** Banning a whole class to prevent a rare misuse
  costs more capability than the misuse costs. Detect the misuse instead.

---

## Form is independent of move — guidance aims, machinery holds

Soft-vs-hard is *how firmly* a mechanism holds. It is orthogonal to *which* of the four
moves it makes.

- **Hard** — deterministic. It influences nothing probabilistically; it blocks, fails, or
  emits regardless of an agent's cooperation. A compiler-enforced enum (hard constraint), a
  blocking lint (hard validator/gate), a required structured emit (hard sensor).
- **Soft** — probabilistic. It aims a reasoning agent and cannot block. A house-rule
  reflex, a convention, a model that guides. A skill is soft by nature.

Every cell of the grid exists: a constraint can be soft (a model that aims) or hard (an
enum the compiler holds); a validator can be soft (a review convention) or hard (a blocking
test). Most real mechanisms ship as a **package** — a soft constraint (a model that aims)
carried with hard detection (the lints and drift gates that catch what it only aims at).
Tag the package by its primary move.

**Guidance aims; machinery holds.** When a property must hold regardless of whether the
agent cooperates, the mechanism has to be hard somewhere. A "remember to…" house-rule
aimed at an operator is soft and rots. A runtime hook on a lifecycle moment splits the
enforcement: the *firing* is hard even when the *payload* is soft guidance the agent still
judges.

---

## The three targets — what the mechanism governs

Every mechanism governs one of three things. A mature system covers all three; a thin one
governs only the product and lets the fleet and the models drift.

- **agent** — the fleet and the substrate that *produces* the work: context and dispatch,
  gates and merge-train, mediators and resource locks, lifecycle and observability,
  the governance-doc mechanisms.
- **models-bridge** — the typed models the fleet reasons *through* and the codebase is
  governed *from*: the executable source of truth, the component/zone model, the
  synchronization model, the drift and parity gates, the query surface.
- **product** — the shipped artifact itself: content-fidelity validation, the conformance
  rule engine, provenance stamps, a bounded repair vocabulary.

Target is orthogonal to move and to form. A drift gate (hard validator+gate) governs the
models-bridge; a ban-lint (hard constraint) governs the agent's raw-seam access; a
conformance run (hard validator) governs the product.

---

## The structural forms

Beneath move and form sits the *shape* a mechanism takes — the nine structural forms the
census tags (`validation`, `quality-gate`, `agent-output`, and the rest). The forms are a
finer index than the four moves: two hard validators can differ in form (a schema check vs
a property test), and the form is what tells you *how it is built*. Read the form column of
the census when you need the construction shape; read the move column when you need the
authority role. Full definitions live in the census README.

---

## The mechanism census — the concrete repertoire, beneath this facet

The four moves are the vocabulary. The **census** is the filled-in dictionary: every
concrete mechanism the reference system actually built, one entry per pattern, each naming
*the failure class it kills* and *why it is not just the cheaper thing everyone already
does*.

- **[`mechanisms/INDEX.md`](mechanisms/INDEX.md)** — the census. Every mechanism by target
  and family, with its move (constraint / sensor / validator / gate / package), its form
  (soft / hard), and its model relation. Filter by move: missing *prevention*, scan the
  constraint rows; missing *detection*, scan the sensor/validator/gate rows.
- **`mechanisms/<target>/<family>/<mechanism>.md`** — read individual entries on demand.
  Progressive load: the index is always cheap; a single entry loads only when the task
  reaches it.
- **[`mechanisms/ABSTRACTIONS.md`](mechanisms/ABSTRACTIONS.md)** — the glossary of concrete
  artifacts the mechanisms are built from. When an entry cites `[[slug]]`, look it up here.

The bundle ships the **agent** and **models-bridge** targets — the "self" a coding agent
most directly governs. The **product** target is audited at the posture level here; read
its entries from the full published catalogue when the audited repo ships a user-facing
artifact.

**The models-bridge entries are dual-cited.** They are alignment mechanisms *and* the
modeling substrate. Their record lives once, here under `mechanisms/models-bridge/`;
[`modeling/repertoire.md`](../modeling/repertoire.md) cites them as model *families*. One
record, two referrers — never duplicated prose.

---

## Ambient Alignment principles

Two principles govern *every* reach into this facet. They come from the portable method
([`principles.md`](../principles.md) A.1–A.3); this is the alignment-facing statement.

- **Architecture before sensors.** Make the error impossible before you catch it. A
  constraint that removes the bad state is worth more than any validator that flags it,
  because the flag still costs the iteration. Reach for the sensor/validator/gate stack
  only for the properties a constraint cannot express — then reach hard.
- **Right-size the mechanism.** Over- and under-engineering are symmetric failures. Close
  the structural issue with the **smallest sound change**; **float** the larger scheme as an
  option rather than reflexively building it. Bias toward the local fix; let the cost of the
  failure justify the heavier mechanism. Where the failure is costly, do both. This is the
  proportionality that keeps the tower of governance from rising — the primary failure mode
  of alignment work is minting mechanisms faster than they earn their keep. That judgment is
  weighed in [`practice/judgment.md`](../practice/judgment.md); the discipline of *whether a
  given episode should mint anything at all* lives in
  [`learning/governance-conversion.md`](../learning/governance-conversion.md).

---

## Self-governance is not self-certification

The sharpest boundary in this facet: **the mechanism establishes the property, not the
agent's belief that the property holds.**

An agent may diagnose, reason, choose moves, create models, propose mechanisms, implement
them when authorized, run checks, inspect evidence, and recommend that work advance. It may
do all of that well. None of it makes its own output *correct* — a validator does, and only
a validator that sits outside the reasoning that produced the change.

```
     SELF-GOVERNANCE
            |
     selects / proposes
            |
            v
     engineering action
            |
            v
           GEE
   constraint sensor validator gate
            |
            v
         evidence
            |
            v
      next judgment
```

Resist every pattern equivalent to *"I generated this, inspected it myself, and therefore
declare it correct."* Reflection assists reasoning; it is not an assurance boundary. Where
feasible, keep the validation and enforcement **outside** the discretionary reasoning that
produced the change — that separation is what makes the verdict trustworthy.

Two consequences for how this skill acts:

- **Hard mechanisms are proposed, not installed by you.** A skill is soft — it aims a
  probabilistic agent, it cannot block. So the hard mechanisms you identify are things you
  **propose and scaffold**, then hand to a human or the harness to wire into a blocking
  path. State plainly what is now *enforced* (the hard mechanism written and verified) versus
  *recommended* (left for a human to wire). Never claim a mechanism is enforced when you have
  only recommended it.
- **A green verdict from a mechanism you also authored is still the mechanism's verdict, not
  yours.** Once the validator is wired and outside the change, its pass is evidence. Your
  confidence never is.

---

## Compose-check — when guardrails collide

A mechanism correct in isolation can be pathological in a portfolio. Before adding one, walk
the *interaction*: what already fires on this event, or touches this resource (a lock, a
commit-set, a lifecycle slot, the context budget)? Two individually-correct mechanisms can
make incompatible demands on one shared resource — a check worth doing at authoring time,
not at collision.

When the pairs grow too many to hold in the head, the durable form of *this* check is itself
a model: the governance-graph entry in the census, whose edges are exactly these conflicts
over a shared resource. Reach for it only once collisions have actually bitten — the tower
warning applies to the meta-level too.

---

## Owns / does not own

- **Owns:** the four alignment moves; prevent-vs-detect; soft-vs-hard; the three targets;
  the structural forms; the mechanism census; the not-self-certification boundary; the
  compose-check.
- **Does not own:** *which* model to build (that is [`modeling/repertoire.md`](../modeling/repertoire.md));
  *how* a representation improves the work ([`modeling/moves.md`](../modeling/moves.md));
  *whether* this situation warrants a mechanism at all
  ([`practice/judgment.md`](../practice/judgment.md)); *what should persist* from a given
  failure ([`learning/governance-conversion.md`](../learning/governance-conversion.md)). This
  facet says *how a property is made to hold* — not whether it is worth holding.
