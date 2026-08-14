# modeling/repertoire — what can be represented

This is your **model vocabulary**: the families of representation you can deliberately introduce when
reasoning gets hard. It answers one question and only one — *what kinds of things can an engineer
represent?* It does not tell you when a situation calls for one (that recognition lives in
[`../practice/situations.md`](../practice/situations.md)), how to introduce one (the verbs live in
[`moves.md`](moves.md)), or how to query the ones this system already has (that contract lives in
[`../system/model-access.md`](../system/model-access.md)).

**The competence here is selection, not accumulation.** There is no required inventory. A system may need
three structural models and no behavioral one. Start from an engineering question and choose the *smallest*
representation that makes the relevant property answerable. Model only the view where the failure lives —
do not build the whole picture because the question happens to span it.

## How to read a family

Each family below carries the same record. Read it to decide whether the family fits your question, and
how far to take it.

- **Question answered** — what the engineer must be able to know.
- **Concepts** — the entities and relations that belong in it (and, by omission, what does not).
- **Relationships exposed** — the connections the representation makes queryable.
- **Useful when** — the situations that make the family worth its carrying cost.
- **Authority possibilities** — the deterministic mechanism the model could later back, if it earns one.
- **Validation** — the evidence that the model still corresponds to reality.
- **Alignment surfaces** — the obligation the model exposes that Alignment could hold ([`../alignment/repertoire.md`](../alignment/repertoire.md)).

A model is a noun. Every family here names one. The verbs that transform a poorly-represented situation
into one of these — *externalize*, *make authoritative*, *check correspondence* — live next door in
[`moves.md`](moves.md); do not look for them here.

---

## The authority ladder — how formal to get

A representation can sit at any rung of one progression, and most situations do not descend the whole way:

```
implicit knowledge
     ↓  externalize
explicit prose
     ↓  structure
structured representation
     ↓  relate
related models
     ↓  make executable
executable / checkable model
     ↓  give authority
alignment surface
```

Each step down buys stronger reasoning and a stronger possible control, and costs more to author and keep
honest. **Stop at the rung the risk warrants.** An advisory prose note that removes a recurring confusion
is a finished model; it need not become executable. A stale executable model is worse than an honest prose
one. The rung to stop at is a judgment call — weigh it in [`../practice/judgment.md`](../practice/judgment.md), do
not default to the bottom.

The last rung — *representation to authority* — is its own family below, because deciding *which* declared
property deserves a deterministic mechanism is a distinct move from choosing a representation.

---

## 1. Structure and boundaries

**Question answered.** What are the parts, who owns each surface, and which relationships across boundaries
are permitted?

**Concepts.** Components, the zones (directories, modules, surfaces) each owns, the interfaces and seams
between them, and the dependency edges that cross those seams. In: ownership, permitted crossings,
declared interfaces. Out: runtime state, timing — those belong to behavior.

**Relationships exposed.** Which component owns a surface; which seam a dependency must pass through; which
crossings are sanctioned versus forbidden.

**Useful when.** The parts of the system blur, an agent keeps re-deriving where code belongs, or a
powerful surface (a format library, a raw datastore) is reachable by too many routes.

**Authority possibilities.** A boundary lint or an admission gate: a directory with no owner, two owners,
or a dependency crossing an undeclared seam becomes a finding.

**Validation.** Reverse-map the repository tree and the observed dependency edges; compare against the
declared ownership and permitted seams. Directory existence can be rediscovered; *ownership* must be
authored — someone decides what the architecture ought to be.

**Alignment surfaces.** "Each surface has one owner." "Boundary crossings use sanctioned seams." "A
mutation surface is reachable only through a declared door." *(Instances: a component-and-zone model with a
boundary lint; a service-flow model whose permitted edges are the only legal service-to-service calls; a
domain registry that eliminates duplicated authority for a slowly-changing fact; a bill-of-materials that
reconciles imports against a dependency manifest.)*

---

## 2. Behavior and ownership

**Question answered.** What states may this object occupy, which transitions are legal, and — when work
runs concurrently — who may act on it now?

**Concepts.** States, the legal transitions between them, terminal states, and the ownership overlay (an
owner, a lease, an expiry). In: the transition relation, the acquisition/release protocol. Out: everything
irrelevant to the lifecycle question — a behavioral model earns its clarity by omission.

**Relationships exposed.** Which transitions are reachable from which state; which owner holds a work item;
whether observed acquisition order respects a required order.

**Useful when.** A lifecycle is scattered across ad-hoc status flags, a terminal item gets reprocessed, or
concurrent workers overlap, fail, or retry on shared work.

**Authority possibilities.** A transition primitive that mediates real state changes rather than
documenting them; a lease, compare-and-swap, or admission check that makes an ownership invariant
enforceable.

**Validation.** Compare the declared transition relation against the implementation sites that perform
transitions; observe runtime ownership facts against the authored protocol.

**Alignment surfaces.** "Only declared transitions occur." "Terminal work does not re-enter processing." "A
leased item has exactly one valid owner." *(Instances: a job-lifecycle state machine with a transition
table; an ownership/lease specialization — note that "how many may execute?" is a different question, a
semaphore or mediator, from "who may mutate?", single-writer ownership; do not collapse them.)*

---

## 3. Execution and placement

**Question answered.** Where does work run and connect, and which execution decisions may vary by
environment?

**Concepts.** A deployment topology (the stable graph of what runs where and talks to what) and a host
execution policy (how aggressively work may be scheduled on a given host profile). In: the topology edges,
the per-profile scheduling policy. Out: conflating the two — placement is stable, scheduling varies.

**Relationships exposed.** Which node reaches which; which host profile a stage runs under; how concurrency
and cost bounds change across profiles.

**Useful when.** Deployment wiring drifts from the intended shape, or a per-host concern (load rationing,
concurrency cap) starts getting encoded by mutating the deployment graph instead of the scheduler.

**Authority possibilities.** A deployment gate that reconciles configuration against the topology; a
scheduler check that reconciles behavior against the host profile.

**Validation.** Reconcile deployment configuration against the topology; reconcile scheduler behavior
against the declared per-profile policy.

**Alignment surfaces.** "Placement and scheduling follow declared policy." "No deploy edge carries a
scheduling intent." *(Instance: a deployment-topology model plus a host-execution-policy table — elastic
host fans out, scarce host serializes — kept separate so a load decision never rides on the placement
graph.)*

---

## 4. Measurement

**Question answered.** What quantity matters, how is it observed, what bound has been declared, and what
should happen when the bound is exceeded?

**Concepts.** A measure (quantity, unit, scope, observation source) and a bound (threshold, aggregation,
authority status). The authority field is the point: a bound may be descriptive, report-only,
warning-producing, or admission-blocking. In: scope and aggregation — part of the property. Out: a bare
number with no scope, which is not an engineering declaration.

**Relationships exposed.** Which measure a bound governs; over what request class, statistic, and window
the claim holds.

**Useful when.** The system makes a quantitative promise (latency, queue depth, cost envelope) that is
currently implicit, or a measured number is about to be given authority it has not earned.

**Authority possibilities.** Report, warning, or an admission gate — chosen by how much the evidence
warrants, not by whether the number is measurable.

**Validation.** A sensor supplies the observation; the model supplies the declared interpretation and,
where justified, the bound. Represent first; grant authority only when evidence warrants it.

**Alignment surfaces.** "Observed quantity remains within a declared bound." *(Instance: a measure-and-bound
model where a latency or cost promise carries an explicit scope and an authority status — this connects to
the evidence-quality distinction between a measurement and an obligation; query the live numbers through
[`../system/model-access.md`](../system/model-access.md), and route coverage gaps to
[`../learning/governance-conversion.md`](../learning/governance-conversion.md).)*

---

## 5. Documentation and provenance

**Question answered.** What happened to an artifact, and which human-facing account of it must remain true?

**Concepts.** An action record (artifact, operation, actor, mechanism, timestamp, result) and derived
documentation (a rendered claim traced to a source fact). In: the structured provenance fact, the
generation relation. Out: the pretense that free prose is mechanically checkable against the
implementation.

**Relationships exposed.** Which action produced which change; which generated claim rests on which fact;
which references resolve to existing identities.

**Useful when.** A change cannot be traced to its origin, documentation drifts from the system it
describes, or an audit needs to explain and reverse a mutation.

**Authority possibilities.** Mechanical validation of structured provenance; regeneration of derived
documentation from current facts; a completion gate that fails when a required record is missing.

**Validation.** Structured provenance validates mechanically. Generated documentation regenerates. Free
prose generally cannot be proven semantically equivalent to the code — keep that boundary honest rather
than pretending every explanation is decidable.

**Alignment surfaces.** "Every relevant mutation leaves a provenance record." "Derived documentation
reflects current facts." *(Instances: per-mutator attribution stamps with a wiring lint that fails when a
sanctioned mutation verb lacks a stamp; a derived changelog reconstructed from those stamps; a naming
convention that marks machine-inserted artifacts.)*

---

## 6. Joining views around a scenario

**Question answered.** How do several small models compose to answer one question that crosses all of them?

**Concepts.** A scenario (a user journey, an incident, a release) and the stable identities — an endpoint,
a component, a work item — through which small, question-specific models join. In: shared identities and
the traversal across views. Out: a stored mega-model; the join is a traversal, not a seventh copy of every
fact.

**Relationships exposed.** How one fact propagates through several views without being copied into each;
which cross-view property holds only when the views agree.

**Useful when.** A real question spans structure *and* coverage *and* placement, and the reflex is to build
one giant model instead of joining the small ones you already have.

**Authority possibilities.** Composed validation, where each cross-view obligation is decidable through the
identity joins.

**Validation.** Check the join, not a monolith: do declared journey dependencies match actual call sites;
are declared endpoints exercised; does test placement reflect journey criticality.

**Alignment surfaces.** "Cross-view obligations agree." "Every major journey part has the required
coverage." *(Instance: a critical-journey view that joins endpoints, coverage, test-tier placement, and
host policy through shared identity — none of the feeder models is the point; the composition is.)*

The move here is composition by shared identity, not enlargement: `engineering question → select relevant
views → join on stable identities → state the cross-view property`. Do not grow a mega-model because the
question is broad.

---

## 7. Representation to authority

**Question answered.** Which represented property deserves a deterministic mechanism, and how does a model
cross from *describing* into *governing*?

**Concepts.** A represented obligation (drawn from any family above), a correspondence mechanism that
detects disagreement between the model and reality, and a possible authority (report, lint, build failure,
admission gate). This family is the ladder's last rung — the seam, not a stored model.

**Relationships exposed.** For a given represented property: what correspondence check could detect its
violation, and what enforcement rung that check could carry.

**Useful when.** A model already improves reasoning and you are deciding whether it should also *hold* — or
when you catch yourself treating every representation as if it must become a gate.

**Authority possibilities.** The full rung set — report, lint, build failure, admission gate — chosen per
obligation, because not every represented property deserves a gate.

**Validation.** The correspondence mechanism itself: it must detect a real divergence between the declared
property and the observed system, or the authority rests on nothing.

**Alignment surfaces.** This family *is* the handoff to Alignment — a model creates a surface, and
[`../alignment/repertoire.md`](../alignment/repertoire.md) decides which surfaces become constraints,
sensors, validators, or gates. Agreement between a model and the code does not by itself establish
correctness: a descriptive model can faithfully describe a bad system. An independently authored *ought*
is what gives the implementation something to be wrong against. Modeling makes knowledge explicit;
Alignment decides what deserves authority. Keep the two as separate engineering decisions.

---

## Where to go next

- **To introduce one of these** — the transformations that build a model up a rung are the verbs in
  [`moves.md`](moves.md).
- **To recognize which family a symptom calls for** — the field guide in
  [`../practice/situations.md`](../practice/situations.md).
- **To decide how formal to get** — the proportionality judgment in
  [`../practice/judgment.md`](../practice/judgment.md).
- **To query the models this system already exposes** — the provider contract in
  [`../system/model-access.md`](../system/model-access.md).
- **To turn a declared property into a control** — [`../alignment/repertoire.md`](../alignment/repertoire.md).
- **For runnable scaffolds** of these families — [`../templates/system-models-starter-kit.md`](../templates/system-models-starter-kit.md).

## Owns / does not own

- **Owns** the model *nouns* — the families of representation and the selection judgment among them.
- **Does not own** the move verbs ([`moves.md`](moves.md)), situation recognition
  ([`../practice/situations.md`](../practice/situations.md)), or querying this repository's concrete models
  ([`../system/model-access.md`](../system/model-access.md)).
