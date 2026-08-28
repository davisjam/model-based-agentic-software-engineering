<!-- summary: The construction kit for a Governed Engineering Environment — 8 principles, 9 capabilities, 24 canonical mechanisms, 8 compositions, and the variants and known uses that fold under them. -->

# Constructing the Governed Engineering Environment

*A catalogue of models, controls, compositions, and known uses.*

The entries in this catalogue are not seventy independent design patterns. They are the concrete
machinery of a **governed engineering environment**: the models an agent fleet reasons through, the
surfaces it acts through, the evidence its work must produce, and the loops that convert a failure into a
control. This page is the map of that machinery. It names what the environment must be able to **do**, the
canonical mechanisms that give it those capabilities, the stacks that are strong together, and the
concrete variants each mechanism was built from.

## The two principles, built

The book develops two claims. The **Modeling Principle** says an agent works coherently when intent and
system structure are bound into a compact, checkable representation it can reason through. The **Alignment
Principle** says implementation stays trustworthy when the environment mechanically holds it to those
representations and the policies they express. The catalogue is what those two principles look like once you
build them. Every capability below serves one principle or the other, and most serve both.

## The claim this catalogue makes

The DocAble case produced <!--census:controls-->85<!--/census--> concrete governance mechanisms.
Comparative analysis reduced them to **24 canonical mechanisms** under **9 capabilities**. The rest are
retained, not discarded: the **variants and known uses** fold under a parent mechanism, **two pairs merge**
into one, **one entry rises** to a principle that explains where the others sit, and the **external-spec
conformance engine** moves out to the product case study (it is the product, not a portable pattern). The
reduction is the finding. Where several entries solve the same problem through the same structure, they are
one idea worn several ways, and the catalogue says so instead of counting each dress as a concept.

The merge rule was strict. Two mechanisms collapse only when they share the same failure, obligation,
structure, guarantee, semantic level, and tradeoffs, differing only in where they were used. They stay
distinct when the **relation** they model or enforce differs, even when both are "a lint" or both are "a
model." All lints are not one pattern. All models are not one executable model. That guard is what keeps
the 24 honest.

## Four levels, not one

The entries do not sit at a single altitude, so the catalogue reads them at four levels.

- **Capabilities** — what the environment must accomplish. Nine of them. They **organize** the catalogue;
  they are not themselves entries.
- **Canonical mechanisms** — the reusable structure that supplies a capability. Twenty-four. This is the
  intellectual core: an executable source of truth, a drift gate, a sanctioned mutation surface, a
  re-derived completion gate.
- **Compositions** — mechanisms that are stronger stacked than alone. Eight named stacks.
- **Variants and known uses** — the concrete realizations that give the case its texture: a PDF mutation
  model, an `N=1` test lock, per-mutator stamps. They preserve how it was actually built without earning
  separate conceptual status.

## Not the Gang of Four's subject

The closest predecessor in form is *Design Patterns*, but the subject has moved. The Gang of Four
catalogued recurring structures **inside** an object-oriented program: how objects collaborate. This
catalogue describes recurring structures in the **environment that produces and maintains** a system with
agents. Its questions are different ones. What state is authoritative? Where may an agent act? What
evidence does a change owe? Which properties must stay invariant? How does a failure that happened once
become a control that fires on every change after it? The commonality among the entries is functional, not
formal: each supplies a capability the environment requires.

---

<a id="principles"></a>
## The eight principles

The principles are the deep claims that explain the catalogue. They are not entries you install; they are
the reasons the mechanisms take the shapes they do. One entry, the placement judgment, was lifted out of
the mechanism set to sit here as a principle in its own right.

- **P1 · Bind intent to structured models.** The environment's authoritative knowledge lives in typed
  models the fleet reasons through, not in prose or scattered code. Intent and structure are represented
  so a bounded-context agent can operate a system it cannot hold in view. *Expressed by the whole
  [Maintain authoritative system knowledge](#cap-know) capability.*

- **P2 · Reconcile models with reality.** A model is trustworthy only while it equals the territory. Every
  authoritative representation owes a mechanical check that it still matches the code it describes.
  *Expressed by [Keep representations equal to reality](#cap-sync).*

- **P3 · Constrain action through sanctioned surfaces.** Bound a probabilistic actor by making the unsafe
  move impossible to represent. Route mutation through one typed surface, express authority and repair as
  closed vocabularies, and hold each with a ban-lint. *Expressed by
  [Constrain where and how agents act](#cap-constrain).*

- **P4 · Re-derive evidence rather than trust reports.** Establish completion by recomputing evidence,
  never by trusting an actor's self-report. The gate re-runs the checks itself. *Expressed by
  [Establish completion on re-derived evidence](#cap-complete).*

- **P5 · Convert recurring failures into enforced controls.** A failure that recurs is converted, once,
  into a deterministic control that fires on every later change. Audit findings become lints; the memory
  moves out of the reviewer and into the substrate. *Expressed across most of the catalogue, and directly
  by [Machine-Enforced Semantic Policy](#m-semantic-policy).*

- **P6 · Preserve provenance and accountability.** Every inserted artifact and every consequential action
  carries a durable, machine-checkable trace back to its cause, so a change can be explained, audited, and
  reversed. *Expressed by [Track provenance and trace causes](#cap-provenance).*

- **P7 · Model the governance environment itself.** Once controls proliferate, the control machinery is a
  system in its own right, and it must be modeled, covered, and reasoned over. Governance of governance.
  *Expressed by [Govern the control machinery itself](#cap-govern).*

- **P8 · Enforce at the right semantic level.** A control must fire where the property actually lives — a
  structural property gets a deterministic check, a semantic one gets a model or a judge — and it must be
  as legible as the failure it prevents. This is the placement judgment that explains where every other
  mechanism sits. It began as a catalogue entry,
  [Enforce at the right semantic level](agent/governance-doc-controls/semantic-level-enforcement.md), and
  was lifted to a principle.

---

## The nine capabilities

Each capability names a job the environment must do, then works its canonical mechanisms as design-pattern
entries: **Intent**, the **vivid failure** that motivates it, the **Solution** structure, the
**Guarantee** and its boundary, and the **Forces &amp; limits**. Each entry is then illustrated by its
folded variants — every example named for the **one facet it alone shows**, so the catalogue reads as
patterns instanced by examples, not a flat list. A folded entry that is also a member of a flagship stack
appears as a **short example plus a deep-dive link** to that stack, where its full treatment lives once;
the rest fold as one-line **known uses**. Every example is a real case of *this* mechanism, never a
sibling's.

<a id="cap-know"></a>
## KNOW · Maintain authoritative system knowledge

*Represent intent and structure in typed models the fleet reasons through.*

### [Executable Source of Truth](models-bridge/system-models/executable-source-of-truth.md) · principle P1

**Intent.** Keep the authoritative knowledge as machine-readable typed data that the fleet continuously
consumes and the build mechanically holds true (our instance: a typed system-models bridge). This is the
interface through which a bounded-context agent operates a system it cannot hold in view.

**Vivid failure.** A stale architecture paragraph no longer matched the code, so agents reasoned from a lie.

**Solution.** Author the knowledge as typed data — projected as data, not code — and wire a build-time
parity gate to each model so drift fails the build. The model files, the projection, and the parity wiring
are the machinery; the subject models below are what that machinery is turned on.

**Guarantee.** Every consumer reads one authoritative answer, and a model change reaches all of them at
once. The boundary: only facts the model expresses are held true — a fact still living in code drifts
unseen until it too is modeled.

**Forces &amp; limits.** A model is only as strong as its parity coverage. Authoring costs real effort, so
a model earns its slot by being read by at least one gate; a model nothing consumes is documentation
wearing a schema. An alternative keeps the same discipline as a doc *generated from* code — weaker, because
code becomes the source and the model only its derived view.

*Examples — each a different facet:*

- **[component &amp; zone model](models-bridge/system-models/component-zone-model.md) — structural-ownership
  facet.** The fix-once registry every tool queries for "what are our internal packages and focus dirs."
  This is the mechanism at its plainest: one typed list, read at lint time by many consumers, so a moved
  boundary updates all of them instead of staling each tool's private inference of the tree.
- **[service-flow model](models-bridge/system-models/service-flow-model.md) — architecture-topology facet.**
  Models the cross-service call graph as typed nodes and edges — who calls whom, across which seam — so an
  architectural question becomes a graph walk, not a code read. Its generation half (projecting stubs from
  the topology) belongs to the codegen member below; the facet here is the topology itself.
- **[agent-orchestration model](models-bridge/system-models/agent-orchestration-model.md) — subject-shift
  facet.** The reflexivity showpiece: the same modeling discipline turned on the fleet that produces the
  work. Dispatch lifecycle, roles, and worktree topology become typed data the orchestrator reasons
  through, so governance models its own producer.
- **[timeout-budget ordering model](models-bridge/system-models/timeout-budget-ordering-model.md) —
  temporal-containment facet.** Encodes the nesting order of timeout budgets along a call chain as a typed
  constraint. An inner budget that outlives its outer one surfaces as a build finding rather than a latent
  production hang found under load — the mechanism catching a dynamics bug at author time.
- **[data-flow model](models-bridge/system-models/data-flow-model.md) — transitive-reachability facet.**
  Models data movement as a graph, so a compliance question ("can sensitive data reach this sink?") is a
  reachability query. The facet only a graph carries: a property no single node holds, only the closure of
  edges does.

*Flagship members (short — the deep treatment lives in the stack):*

- **[model-driven codegen](models-bridge/system-models/model-driven-codegen.md) — generation facet.** The
  model's other face — projected into code artifacts, so hand-drift between spec and generated surface
  cannot open. Deep dive → [the model-coherence stack](book/appendix-a-model-coherence-stack.html) (alt
  appendix).
- **[rule-metadata registry](models-bridge/system-models/rule-metadata-registry.md) —
  prose-as-queryable-model facet.** Governance prose lifted into typed rows a lint can query, so "which
  rules govern this path?" is a lookup. Deep dive →
  [the governance-conversion stack](book/appendix-a-governance-conversion-stack.html) (alt appendix).
- **[concurrency contracts](models-bridge/system-models/concurrency-contracts.md) — declared-coverage
  facet.** The model side of resource mediation: every permitted concurrent seam declared, so a coverage
  lint detects any unmediated bypass. Deep dive →
  [the resource-mediation stack](book/appendix-a-resource-mediation-stack.html) (alt appendix).

*Known uses:*
[user-journey](models-bridge/system-models/user-journey-model.md) (goal→implementation, a capability gated
on its governance) ·
[domain registries](models-bridge/system-models/domain-registries.md) (fact-canonicalization across the
codebase) ·
[process view](models-bridge/system-models/process-view.md) (Kruchten's concurrency enumeration, derived) ·
[typed contract surfaces](models-bridge/system-models/typed-contract-surfaces.md) (boundary contracts that
double as fuzz oracles) ·
[synchronization](models-bridge/system-models/synchronization-model.md) (an undeclared lock or inverted
order fails at author time) ·
[lifecycle model](models-bridge/system-models/lifecycle-model.md) (the operational map the operator runbook
is projected from) ·
[deployment topology](models-bridge/system-models/deployment-topology-model.md) (physical topology) ·
[telemetry-collection provenance](models-bridge/system-models/telemetry-collection-provenance.md)
(observability coverage) ·
[agent-first MBSE harness](models-bridge/system-models/agent-first-mbse-harness.md) (adopt the schema, skip
the runtime) ·
[invariant-DAG execution policy](models-bridge/system-models/invariant-dag-execution-policy.md) (a closed
edge-intent enum separating correctness edges from resource edges) ·
[required-config-per-role manifest](models-bridge/system-models/required-config-per-role-manifest.md)
(fail-fast env validation with an admission face; online-only).

*Deep dive:* [the model-coherence stack](book/appendix-a-model-coherence-stack.html) (alt appendix) — this
is its DATA member.
*Related:* Enabler — [Read the Model, Don't Copy It](#cap-know) (the consumption half) · Counterpart —
[Drift / Parity Gate](#cap-sync) (holds it true) · Layer — [Derived Traceability](#cap-sync) (the rung
above parity).
<!-- prior-art: LPP §6 model-sync / drift-detection literature, populated by LPP-PROSE -->

### [Read the Model, Don't Copy It](models-bridge/system-models/meta-model-consumption.md) · principle P1

**Intent.** Consumers derive answers from the live model at use time; the copied-out value is banned (our
instance: a ban-lint on snapshotted model values).

**Vivid failure.** A value snapshotted out of the model drifted from it, silently disabling a check keyed
on the stale copy.

**Solution.** A ban-lint flags copied-out values on policed paths; consumers call the read surface instead
of caching a snapshot.

**Guarantee.** One authoritative answer holds; a model change updates every consumer at once.

**Forces &amp; limits.** The ban-lint covers only policed paths — a copy on an unpoliced path still drifts.
And the read surface must be ergonomic, or consumers route around it and copy anyway.

*Examples — each a different facet:*

- **[model query surface](models-bridge/system-models/query-surface.md) — ergonomic-read facet.** The soft
  carrot to the ban-lint's stick. A clean read API makes reading the model easier than copying from it, so
  compliance becomes the path of least resistance rather than a rule fought against.
- **[model-graded finding severity](models-bridge/system-models/model-graded-finding-severity.md) —
  consume-to-grade facet.** Severity computed as a function of the finding and the change against the live
  component model at gate time — reading the model to *decide*, not merely to look up. A borderline fold;
  see [the folds note](#folds).

*Related:* Counterpart — [Executable Source of Truth](#cap-know) (the authored half) · Sibling —
[Drift / Parity Gate](#cap-sync).

### [Composed State-Machine Model](models-bridge/system-models/composed-state-machine-model.md) · principle P1

**Intent.** Author the concurrency composition as one checkable object: which lifecycles exist, how they
compose, and the predicates that must hold across them, each predicate carrying a derived verification
obligation.

**Vivid failure.** Two async lifecycles, legal alone, deadlocked when composed — and no single-machine
model could see it.

**Solution.** Typed lifecycle machines with cross-machine invariants — the specification a formal verifier
runs against.

**Guarantee.** A cross-machine predicate that can be violated is caught by the routed checker, not
discovered in production.

**Forces &amp; limits.** The model must stay faithful to the real lifecycles or it proves the wrong thing.
Composition explodes the state space, so the checker is routed by the invariant's temporal shape rather
than run whole.

*Deep dive:* [the assurance stack](book/appendix-a-assurance-stack.html)
(alt appendix) — its SPEC member.
*Related:* Bridge — [Model-Derived Assurance Coverage](#cap-complete) (the checker it feeds) · Enabler —
[formal invariant verification](models-bridge/system-models/formal-invariant-verification.md).

<a id="cap-sync"></a>
## SYNC · Keep representations equal to reality

*Reconcile the model against the code it describes, and catch drift mechanically.*

### [Drift / Parity Gate](models-bridge/system-models/drift-parity-gates.md) · principle P2

**Intent.** Keep the map equal to the territory in both directions: a build-blocking parity predicate
fails the moment the model or the reality drifts alone.

**Vivid failure.** A moved directory silently staled every tool's private inference of the tree.

**Solution.** Bidirectional parity lints wired into the build; divergence either way fails it.

**Guarantee.** The model and the code it describes cannot diverge across a green build. The boundary: the
gate holds only the source pair it names — an unwired relation drifts freely.

**Forces &amp; limits.** A parity gate stores nothing, but it still runs a comparison each build; where the
join can be *derived* instead of compared, [Derived Traceability](#cap-sync) is the stronger rung. A
too-broad parity predicate flakes on benign churn and trains agents to suppress it.

*Examples — each a different facet:*

- **[doc-hygiene lints](agent/governance-doc-controls/doc-hygiene-lints.md) — corpus facet.** The parity
  relation turned on a *document corpus* and its declared index: a doc that exists but is unlisted, or a
  listed doc that no longer exists, fails the build. Same predicate, prose instead of code as the reality.
- **[coherence lints](product/validation-and-conformance/coherence-lints.md) — cross-source facet.**
  Relational parity between two live sources — a config field set must stay a subset of its sample — so the
  scar it kills is a silently collapsed batch size that CLR-defaulted a missing field to zero.
- **[DDT pin-trailers](product/regression-tests/ddt-pin-trailers.md) — derived-test-freshness facet.** A
  test pinned to the source it cites carries a trailer that reddens when the source edits without the test
  regenerating. Near-zero defect yield is the point: it holds a derived artifact fresh against its origin.

*Related:* Counterpart — [Executable Source of Truth](#cap-know) (what it holds true) · Layer —
[Derived Traceability](#cap-sync) (the rung that removes the store).

### [Derived Traceability](models-bridge/system-models/symbol-anchored-traceability-graph.md) · principle P2

**Intent.** Make every cross-layer join a typed edge re-proven against live reality at read time, so
liveness is a property of the representation — resolution *is* the read, not a sync job beside a stored
graph.

**Vivid failure.** A stored traceability edge went stale, claiming a join reality had already severed.

**Solution.** Symbol-anchored edges that redden at scan time when the anchor no longer resolves.

**Guarantee.** A derived edge cannot drift; remove the store, and drift has nowhere to live. This is the
rung above a parity gate — nothing to keep in sync because nothing is kept.

**Forces &amp; limits.** Re-resolution costs a scan on every read, so a hot path pays for its own honesty;
and the anchor must be stable enough that a benign rename does not read as a severed join. Where resolution
is genuinely expensive, a parity gate over a stored edge is the affordable fallback.

*Deep dive:* [the model-coherence stack](book/appendix-a-model-coherence-stack.html) (alt appendix) — its
DERIVE member, the highest rung of the coherence ladder.
*Related:* Generalization — [Drift / Parity Gate](#cap-sync) (the rung below) · Consumer —
[Executable Source of Truth](#cap-know).

<a id="cap-constrain"></a>
## CONSTRAIN · Constrain where and how agents act

*Sanctioned mutation surfaces, closed action vocabularies, and enforced semantic policy.*

### [One Door Enforced](product/canonical-models-and-seams/pdf-model.md) · principle P3

**Intent.** Route all mutation of a hazardous resource through one typed surface that encodes its
invariants, with the raw alternative structurally banned (our instance: a single PDF mutation model). The
bug is made unrepresentable, not reviewed for.

**Vivid failure.** A raw library call bypassed a format's invariants and shipped a corrupt tag tree.

**Solution.** A single sanctioned mutation model, with a dedicated ban-lint holding every call site off the
raw library. The model and its ban-lint are one mechanism — the construction and its enforcement bundled,
because the enforcement is one-to-one with this seam.

**Guarantee.** No code path mutates the resource except through the door, so an invariant the door encodes
holds on every artifact. The boundary: the door guards its own resource; a second hazardous resource needs
its own door.

**Forces &amp; limits.** The door must cover the full mutation surface, or an unhandled operation tempts a
raw-library escape. It is authored once but paid for forever in the ban-lint's coverage. Where the resource
is trivial, a door is over-engineering — reserve it for a resource whose invariants a raw call can silently
break.

*Examples — each a different facet:*

- **[Office models](product/canonical-models-and-seams/office-models.md) — replication facet.** The same
  construction-plus-ban applied to a *second* object model, so a fix to the shared discipline serves every
  format at once. Shows the mechanism's fix-once payoff: the value is not that this door is the best door,
  but that there is exactly one per resource.
- **[the typed service client](product/canonical-models-and-seams/service-client.md) — cross-service
  facet.** Here the door is a *type signature*: a client whose file-argument is a binary stream, so the
  file-path-over-the-wire bug cannot be expressed. The enforcement is the shape of the interface, not a
  separate lint.
- **[the raw-Redis seam](product/canonical-models-and-seams/raw-redis-seam.md) — shared-state facet.** The
  door owns atomicity and a declared key schema for a shared datastore, so every writer goes through the
  seam that keeps the multi-step mutation tearing-proof.

*Known uses:*
[canonical walkers](product/canonical-models-and-seams/canonical-walkers.md) (one traversal per tree — the
door applied to reads, low enough novelty to fold as a row).

*Deep dive:* [the model-coherence stack](book/appendix-a-model-coherence-stack.html) (alt appendix) — the
PDF model is its SEAL member.
*Related:* Sibling — [Closed Action Vocabulary](#cap-constrain) (bounds the verbs, as this bounds the
surface) · Enabler — [Caused-By Provenance](#cap-provenance) (one door makes complete stamping feasible).

### [Closed Action Vocabulary](product/repair-vocabulary/remediation-verbs.md) · principle P3

**Intent.** Make the actor's move-space a closed, named, typed set (our instance: a fixed set of
remediation verbs). Bounding the action space is what makes attribution, validation, and policy tractable
at all; an absent action forces a deliberate addition to the vocabulary rather than an ad-hoc move.

**Vivid failure.** An open-ended repair space made attribution and validation unanswerable — anything could
have happened, so nothing could be checked.

**Solution.** A closed, typed set of verbs; every mutation is one named verb, and the set is the surface a
validator and an attribution system read.

**Guarantee.** Every action taken is one of the named verbs, so the questions "what could have happened
here?" and "is this action permitted?" are decidable. The boundary: the vocabulary bounds *which* verbs,
not whether each verb's implementation is correct.

**Forces &amp; limits.** A closed set trades expressiveness for checkability — a genuinely new capability is
a deliberate addition, which is the cost and the point. Set the closure at the relation that matters
(repair verbs, authority bundles); a vocabulary drawn too fine becomes noise.

*Examples — each a different facet:*

- **[typed categories](product/repair-vocabulary/typed-categories.md) — classification facet.** The closed
  set applied to *classification* rather than action: a finite enum of violation categories whose
  exhaustiveness is the checkable property, so an unclassifiable case is a named gap, not a silent
  fall-through.
- **[role-typed dispatch](agent/context-and-dispatch/role-typed-dispatch.md) — authority facet.** The same
  closure over *authority*: a launched actor's capabilities are a closed bundle fixed at dispatch, so what
  it may do is bounded before it runs rather than discovered from what it did.

*Known uses:*
[codemod-first](product/repair-vocabulary/codemod-first.md) (an execution-*mode* discipline for bulk
mechanical change, built on a batch-size threshold; it bounds how a change runs, not the verb relation, so
it folds as a row — online-only).

*Deep dive:* [the safe-launch composition](#compositions) pairs this with Validated Dispatch (a well-formed
order plus bounded authority).
*Related:* Sibling — [One Door Enforced](#cap-constrain) · Consumer —
[Caused-By Provenance](#cap-provenance) (a closed verb set is what makes stamp coverage decidable).

<a id="m-semantic-policy"></a>
### [Machine-Enforced Semantic Policy](product/validation-and-conformance/semantic-lints.md) · principle P5

**Intent.** Encode every mechanically-detectable domain invariant as a blocking check with scoped,
reason-bearing escapes, so audits become lints and policy moves out of reviewer memory into durable
machinery.

**Vivid failure.** A policy that lived in a reviewer's memory was violated the moment the reviewer became a
fleet — and worse, one checker became the hazard, a runaway regex whose fix was deleting the surface rather
than linting the bug.

**Solution.** A fleet of blocking semantic lints, each carrying scoped, reason-bearing suppressions so an
escape is a documented decision, not a silent bypass.

**Guarantee.** A detectable violation fails the build every time, on every agent, regardless of who is
reviewing. The boundary: only *mechanically-detectable* invariants qualify — a semantic property gets a
model or a judge, not a lint (the placement judgment of principle P8).

**Forces &amp; limits.** The agentic force is sharp: agents produce violations faster than a human can
review them, which is exactly why the memory must move into the substrate. A lint aimed at a property it
cannot actually decide becomes the hazard — the fix belongs at the property's real semantic level, not in a
cleverer regex.

*Deep dive:* [the assurance stack](book/appendix-a-assurance-stack.html)
(alt appendix) — its LINT member.
*Related:* Generalization — principle P5 (convert recurring failures into enforced controls) · Counterpart —
[Machine-Enforced Semantic Policy at the right level](agent/governance-doc-controls/semantic-level-enforcement.md)
(P8, the placement judgment).

<a id="cap-admit"></a>
## ADMIT · Admit or reject changes

*Gate the work order, and gate the path to production.*

### [Validated Dispatch](agent/context-and-dispatch/brief-linting.md) · principle P4

**Intent.** Structurally validate the instruction packet that confers autonomy before granting it — check
the work order deterministically at the point of no return, not by probabilistic review.

**Vivid failure.** A brief missing its isolation marker launched an agent that edited the mainline
directly, and the failure surfaced downstream, not at authoring.

**Solution.** A deterministic pre-dispatch lint over the brief, wired into the sole launch path; a failing
check refuses the launch.

**Guarantee.** No autonomous actor launches from an ill-formed order. The boundary: the lint checks the
order's *shape* — required markers, declared isolation, cited plan — not whether the plan is wise.

**Forces &amp; limits.** The lint is only as strong as the sole-path wiring; a second launch route around it
reopens the hole. A schema that demands sections without checking their content invites hollow filler — the
limit the planning-template example below carries in its own Forces note.

*Examples — each a different facet:*

- **[epic and design templates](agent/governance-doc-controls/epic-and-design-templates.md) —
  planning-artifact facet.** The same schema-on-the-artifact move applied to *planning* rather than
  dispatch: a template lints a plan for its required sections. Its own limit is instructive — a present-but-
  hollow section passes the structural check, so the schema bounds shape, never substance.
- **[independent pre-implementation design review](agent/governance-doc-controls/independent-design-review.md)
  — admit-the-design facet.** Admission moved from the work order to the *design* it will implement: a fresh
  reviewer who did not author the design re-derives it from the code, rules on its open forks, and gates
  implementation on the ratified result. Where the template checks the plan *has* its sections, this checks
  the design *holds* — the pre-implementation bookend to the close-time [Re-Derived Definition of
  Done](#cap-complete).

*Flagship member (short):*

- **[the mandatory-snippet table](agent/governance-doc-controls/mandatory-snippet-table.md) —
  standing-boilerplate facet.** The registry the dispatch lint reads to know which snippets a brief owes;
  it is both this pattern's check-source and a context-management member in its own right. Deep dive →
  [the context-delivery stack](book/appendix-a-context-delivery-stack.html) (alt appendix).

*Deep dive:* [the safe-launch composition](#compositions) pairs this with Closed Action Vocabulary — a
well-formed order plus bounded authority.
*Related:* Sibling — [Closed Action Vocabulary](#cap-constrain) · Consumer —
[Governed Knowledge Base](#cap-govern) (the snippet table lives in the rule index).

### [Staged Admission Gates](agent/gates-and-merge-train/staged-deploy-gates.md) · principle P4

**Intent.** Order verification cheap-to-expensive along the path to production, each rung independently
re-checkable, so no user meets an unverified build and a predictably doomed run never starts.

**Vivid failure.** An unverified build reached users because the expensive check ran only after promotion.

**Solution.** A canary-to-smoke-to-promote staircase on traffic-free surfaces; each rung re-derives its own
verdict rather than trusting the rung below.

**Guarantee.** A build reaches users only after every rung has passed on it, and a doomed run is killed at
the cheapest rung it fails. The boundary: the staircase gates *admission*, not correctness of the change
itself — a passing build is verified, not proven right.

**Forces &amp; limits.** Rungs must be genuinely independent, or a shared assumption fails them together and
the staircase collapses to one gate. Order by cost so the fast rung sheds the doomed run early; a slow rung
placed first taxes every launch.

*Examples — each a different facet:*

- **[the pre-commit hook](agent/gates-and-merge-train/pre-commit-hook.md) — evidence-binding facet.**
  Tree-sha markers make "the checks ran green on *this* tree" replay-proof, so a later rung can *check* the
  claim instead of *trusting* it — the rung that turns a self-report into verifiable evidence.
- **[the sentinel first-commit](agent/gates-and-merge-train/sentinel-first-commit.md) — t≈0 fail-fast
  facet.** A first commit that runs the gate at minute one bounds the waste of unlandable work — the facet
  of placing a rung as early as possible, before effort accrues against a doomed branch.
- **[merge-train MIS batching](agent/gates-and-merge-train/merge-train-mis-batching.md) —
  independence-before-integration facet.** Batches only non-conflicting work by computing a maximum
  independent set, so conflict-freedom is proven by construction before integration rather than discovered
  in a failed merge.

*Flagship member (short):*

- **[the cron-alerts gate](agent/lifecycle-and-observability/cron-alerts-gate.md) — signal-promoted-to-gate
  facet.** A health signal promoted into a hard barrier: an unresolved critical alert refuses new
  work-dispatch. Deep dive → [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt
  appendix).

*Known uses:*
[test-onion tiers](product/regression-tests/test-onion-tiers.md) (the cost stratification the rungs consume;
its one-second-per-test discipline under fleet velocity survives as a Forces clause here — online-only).

*Deep dive:* [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt appendix) via the
cron-alerts gate.
*Related:* Bridge — [Re-Derived Definition of Done](#cap-complete) (the evidence staircase pairs cheap-early
with full-late) · Sibling — [Validated Dispatch](#cap-admit) (gates the order; this gates the path).

<a id="cap-complete"></a>
## COMPLETE · Establish completion on re-derived evidence

*Recompute completion; derive the assurance obligation from the model.*

### [Re-Derived Definition of Done](agent/governance-doc-controls/epic-definition-of-done.md) · principle P4

**Intent.** Establish completion by independently re-derived evidence against the current state, never by a
recorded assertion. Trust nothing written down before now.

**Vivid failure.** An effort marked itself done while its owned checks had rotted and its commits never
actually landed.

**Solution.** A close tool that re-runs every owned check and verifies commit ancestry against the
substrate as it stands.

**Guarantee.** A "done" mark means the evidence recomputes green *now*, not that someone once said so. The
boundary: it re-derives the checks that exist — a missing check is a coverage gap the assurance census
above must catch, not this gate.

**Forces &amp; limits.** Re-derivation costs a full re-run at close, which is the price of not trusting the
report. It defends against stale and dishonest self-reports; it cannot judge whether the owned checks were
the *right* checks.

*Deep dive:* [the evidence staircase](#compositions) pairs this with Staged Admission Gates — cheap
evidence early, full re-derivation late.
*Related:* Bridge — [Staged Admission Gates](#cap-admit) · Consumer —
[Model-Derived Assurance Coverage](#cap-complete) (defines the checks it re-runs).

### [Model-Derived Assurance Coverage](models-bridge/system-models/model-derived-test-obligation-census.md) · principle P4

**Intent.** Derive the assurance obligation from the model itself — the surface that should be tested, the
tier, the assertion strength, the verification method — and lint the gap, so an untested obligation is a
named finding whose set regrows with every model change.

**Vivid failure.** A green coverage percentage hid an entire untested category of obligations.

**Solution.** An obligation census that draws the owed-test denominator from the models and lints the
shortfall.

**Guarantee.** The denominator of "what should be tested" comes from the model, not from what happens to
have a test, so a whole untested category surfaces as a named finding. The boundary: it covers obligations
the model expresses — an obligation living only in code is invisible until modeled.

**Forces &amp; limits.** The census is only as complete as the model it reads; a coverage number derived
from a partial model is a partial truth wearing a percentage. It names the gap, but closing it still costs
a real test written at the right tier and strength.

*Examples — each a different facet:*

- **[journey-criticality test placement](models-bridge/system-models/journey-criticality-test-placement.md)
  — placement/tier facet.** Which *tier* an obligation is owed at: a critical user journey must run locally
  on every green, so local-green implies every major path exercised — the obligation is not just "tested"
  but "tested where it will actually run."
- **[journey task-closure](models-bridge/system-models/journey-task-closure.md) — assertion-strength
  facet.** How *strongly* the test must assert: pinning one hop past the production break, so a test that
  passes while the feature is broken is itself a named gap. The facet the tier does not carry — a test can
  run in the right place and still assert too weakly.

*Flagship members (short):*

- **[coverage-to-model-node mapping](models-bridge/system-models/coverage-model-mapping.md) — granularity
  facet.** Per-node "is *this* obligation exercised?", the finest grain of the census. Deep dive →
  [the assurance stack](book/appendix-a-assurance-stack.html) (alt
  appendix).
- **[formal invariant verification](models-bridge/system-models/formal-invariant-verification.md) — method
  facet.** Which *checker* an obligation is owed — routing each invariant by its temporal shape to a proof
  over bounded interleavings or a counterexample. The proof pole to the census's exercise pole; a borderline
  fold, see [the folds note](#folds). Deep dive →
  [the assurance stack](book/appendix-a-assurance-stack.html) (alt
  appendix).

*Deep dive:* [the assurance stack](book/appendix-a-assurance-stack.html)
(alt appendix) — its CENSUS member, fed by the Composed State-Machine Model as specification.
*Related:* Consumer — [Composed State-Machine Model](#cap-know) (the spec it verifies against) · Bridge —
[Re-Derived Definition of Done](#cap-complete).
*Known uses in the literature:* the untrusted-generator / trusted-checker split is the discipline of
proof engineering — Ringer and colleagues' survey *QED at Large* (2019) documents what it takes to engineer
formally verified software, and AutoSOUP (Amusuo et al., 2026) routes an LLM's memory-safety reasoning
through a checker that admits only what it can verify. Our operationalization draws the owed-check
denominator from the model and routes each obligation to the checker its shape demands (the
formal-invariant-verification member).

### [Generative Validation](product/regression-tests/fuzz-campaigns.md) · principle P4

**Intent.** Falsify a specification with machine-generated inputs at two poles: invariant-shaped properties
over tame inputs, and wild adversarial inputs fixed to the stable point in the spec.

**Vivid failure.** A fix aimed at a failing fuzz seed passed that seed and still broke every other
spec-allowed input.

**Solution.** Fuzz campaigns with root-cause analysis to the stable spec point, plus property tests at the
tame pole. Its two entries — fuzz and property — self-framed as two sides of one coin, so they are one
mechanism with two poles.

**Guarantee.** A found failure is root-caused to the spec point it violates, so the fix passes every
spec-allowed input, not just the failing seed. In its deepest form the structured model is the oracle,
which collapses the usual tradeoff between a rich oracle and wild inputs.

**Forces &amp; limits.** Generation finds violations; it cannot prove their absence, so it complements — not
replaces — the census's obligation coverage. An oracle weaker than the spec lets wild inputs pass while
still wrong.

*Related:* Sibling — [Model-Derived Assurance Coverage](#cap-complete) (obligation coverage to this one's
falsification) · Consumer — [typed contract surfaces](models-bridge/system-models/typed-contract-surfaces.md)
(spec points that double as fuzz oracles).

<a id="cap-preserve"></a>
## PRESERVE · Preserve product semantics

*Guarantee the product's meaning survives mutation and conforms to spec.*

### [Preservation Invariant](product/validation-and-conformance/content-validator.md) · principle P6

**Intent.** Make semantic preservation a deterministic post-condition checked on every produced artifact:
the input's content must survive as a subset of the output.

**Vivid failure.** A remediation pass silently dropped document content — it ran successfully and produced
garbage, the worst failure mode for a pipeline where "ran but produced nonsense" is invisible.

**Solution.** A validator that checks input-subset-output on every artifact, with a staging variant that
localizes the offending pass by name. This is where damage done *through* the one sanctioned door is
caught.

**Guarantee.** No produced artifact loses input content across a green run, and when it does, the stage
that lost it is named. The boundary: it checks content *survival*, not that the remediation was the *right*
one — preservation, not correctness of intent.

**Forces &amp; limits.** Subset-preservation catches loss, not corruption that keeps the bytes but breaks
the meaning; the per-stage variant costs a validation between every pass, so it runs in staging where the
localization is worth the tax. It pairs with One Door Enforced: the door makes damage rare, this catches
what still gets through.

*Deep dive:* [the auditable-transformation stack](book/appendix-a-auditable-transformation-stack.html) (alt
appendix) — its GATE member, the fidelity backstop to the provenance chain.
*Related:* Counterpart — [One Door Enforced](#cap-constrain) (rarity vs. detection) · Consumer —
[Caused-By Provenance](#cap-provenance) (a caught loss is traced to its stamped cause).

*Moved to the product case study.* The **conformance-to-external-spec engine** — a deterministic predicate
where every finding names the external-standard clause it closes, with the covered/gap/aspirational
coverage claim kept honest by a same-commit discipline — is the product itself, not a portable governance
pattern. It is treated as a case section in the book proper (the built-system chapter of the product case)
rather than as a catalogue mechanism. Its coherence/parity relatives stay under [Drift / Parity
Gate](#cap-sync).

<a id="cap-provenance"></a>
## PROVENANCE · Track provenance and trace causes

*Durable, complete, checkable attribution of every mutation and its cause.*

### [Caused-By Provenance](product/provenance-and-attribution/mutator-stamps.md) · principle P6

**Intent.** Attach durable attribution at the point of every mutation, and check that the wiring is
complete over a closed verb set, so the artifact's mutation history — who changed what, and why —
reconstructs on demand.

**Vivid failure.** An input-versus-output diff could say *what* changed but never *who* or *why*, so a
remediation could not be explained or reversed.

**Solution.** Per-mutator stamps embedded at the mutation site, one sanctioned writer per format. This is a
composed stack presented as one mechanism; its named components are the machinery, not examples:
[the `a11y_` prefix](product/provenance-and-attribution/a11y-prefix.md) marks each invisible insertion and
auto-registers it for validation (the MARK) ·
[per-mutator stamps](product/provenance-and-attribution/mutator-stamps.md) emit at the site (the EMIT) ·
[the F10 wiring lint](product/provenance-and-attribution/f10-wiring-lint.md) covers every verb, so an
unstamped mutator is a build finding (the COVER) ·
[`derive-changelog`](product/provenance-and-attribution/derive-changelog.md) reads the attributed history
back (the READ).

**Guarantee.** Every mutation carries a stamp and the wiring lint proves the coverage is total over the
closed verb set, so the history reconstructs completely. The boundary: it attributes *sanctioned* verbs —
a mutation outside the vocabulary is out of scope, which is why the closed verb set is a precondition.

**Forces &amp; limits.** Complete provenance is feasible only because One Door Enforced routes mutation
through one surface and Closed Action Vocabulary bounds the verbs; without those, the wiring lint has no
finite set to prove coverage over. Stamps add bytes to every artifact — a cost paid for reversibility.

*Examples — the one facet that is not a Solution component:*

- **[caused-by provenance, agent-side](agent/lifecycle-and-observability/caused-by-provenance.md) —
  subject-shift facet.** The same provenance obligation applied to *commits* rather than documents: every
  commit carries a typed cause drawn from a closed taxonomy, so the fleet's own change history is as
  reconstructable as the product's. Shows the pattern is about the *relation* (durable attribution over a
  closed set), not the document domain it was first built in.

*Deep dive:* [the auditable-transformation stack](book/appendix-a-auditable-transformation-stack.html) (alt
appendix) — the MARK, EMIT, COVER, and READ components are its parts, deep-treated there.
*Related:* Enabler — [One Door Enforced](#cap-constrain) + [Closed Action Vocabulary](#cap-constrain) (both
preconditions) · Counterpart — [Preservation Invariant](#cap-preserve) (the fidelity backstop).

<a id="cap-manage"></a>
## MANAGE · Manage work, state, and resources

*Lifecycle records, resource mediation, and fleet observation.*

### [Authoritative Lifecycle State](agent/lifecycle-and-observability/agent-registry.md) · principle P6

**Intent.** Make destructive lifecycle decisions consult an authoritative recorded fact of liveness and
disposition, never an inference from side effects. The record precedes the reclaim.

**Vivid failure.** A cleanup heuristic inferred an agent was dead from filesystem signals and destroyed a
live worktree mid-run.

**Solution.** An append-only registry consulted before any reclaim; tools refuse to operate on an agent
whose live marker exists.

**Guarantee.** No reclaim fires without a recorded fact authorizing it, so a live actor is never destroyed
on a guess. The boundary: the record must be written truthfully at lifecycle transitions — a missing write
leaves a live actor unrecorded, which the marker-refusal defends against conservatively.

**Forces &amp; limits.** Consulting the record costs a read before every reclaim, and a stale record must
fail *closed* (refuse) rather than open. The trade is a rare wrongful-refusal against a catastrophic
wrongful-destruction — the right side to err on.

*Examples — each a different facet:*

- **[tombstone commits](agent/lifecycle-and-observability/tombstone-commits.md) — close-record facet.** An
  irreversible reclaim justified by a durable close record with an explicit disposition, so the record that
  authorizes destruction is the same one that explains it later. The facet: not just "is it live?" but "was
  its closure recorded, with what disposition?"

*Related:* Consumer — [Caused-By Provenance](#cap-provenance) (both make a decision consult a durable
record) · Sibling — [Mediated Resource Admission](#cap-manage).

### [Mediated Resource Admission](agent/mediators-and-resource-locks/test-serializer.md) · principle P3

**Intent.** Mediate shared-resource use through a single admission point at a chosen cardinality —
exclusive for destructive work, bounded for parallel-safe-heavy work — with the raw unmediated path
structurally impossible and the permitted seams declared in a model so a coverage lint detects every
bypass.

**Vivid failure.** Concurrent agents ran the destructive test runner at once and corrupted each other's
shared build state.

**Solution.** An `N=1` host flock on the test runner (the SERIALIZE seam), the raw path banned, coverage
checked against a declared concurrency-contracts model.

**Guarantee.** No more than the chosen cardinality of admitted work touches the resource at once, and the
coverage lint proves no bypass exists. The boundary: it bounds *admission*, not the work's own correctness
once admitted.

**Forces &amp; limits.** The mediated unit's granularity is the load-bearing choice. A semaphore over the
*pieces* of a job still lets two whole *sweeps* overlap; only a singleton mutex over the
aggregate-as-one-indivisible-unit bounds compute at the whole-sweep granularity. Choose the unit the
contention actually lives at, not the finest one available — the aggregate-vs-per-invocation distinction,
not merely the coarsest cardinality.

*Flagship members (short):*

- **[the build-serializer](agent/mediators-and-resource-locks/build-serializer.md) — bounded-M facet.** The
  same admission point at cardinality `M=8` rather than one: parallel-safe-heavy compute admitted up to a
  ceiling, so the seam bounds *count* without forcing serialization. Deep dive →
  [the resource-mediation stack](book/appendix-a-resource-mediation-stack.html) (alt appendix).
- **[adaptive resource-pressure admission](agent/mediators-and-resource-locks/resource-pressure-gating.md)
  — condition-vs-count facet.** One shared pressure signal read at admit *and* during execution, shedding
  on a red host — bounding by the host's live *condition* where the fixed mediators bound by declared
  *count*. Deep dive → [the resource-mediation stack](book/appendix-a-resource-mediation-stack.html) (alt
  appendix).

*Known uses:*
[aggregate-compute protection](agent/mediators-and-resource-locks/aggregate-compute-protection.md) (a
whole-sweep singleton — the aggregate-vs-per-invocation unit its Forces clause above names; online-only).

*Deep dive:* [the resource-mediation stack](book/appendix-a-resource-mediation-stack.html) (alt appendix) —
the test-serializer is its SERIALIZE member, concurrency-contracts its DECLARE model.
*Related:* Consumer — [concurrency contracts](models-bridge/system-models/concurrency-contracts.md) (the
declared-coverage model) · Sibling — [Authoritative Lifecycle State](#cap-manage).
<!-- prior-art: LPP §? adjacent host-mediation / bulkhead literature, populated by LPP-PROSE -->

### [Fleet Observability Surface](agent/lifecycle-and-observability/typed-event-bus.md) · principle P7

**Intent.** Make operational health a queryable, typed, typo-proof signal surface, and bind every signal to
a prescribed response — emission alone is not observability; the loop is emit, interpret, react.

**Vivid failure.** Operational failures scrolled past in free-form logs that carried neither their meaning
nor a response.

**Solution.** An orchestrator-as-reactor over a typed event bus, topics enumerable, each bound to a
playbook.

**Guarantee.** Every emitted signal is typed (so a typo cannot silently disable a subscriber) and carries a
bound response, so a failure is both legible and actionable. The boundary: the surface makes the signal
reactable — whether the *response* is right is the playbook's job, not the bus's.

**Forces &amp; limits.** A typed topic set must be maintained as the system grows, or emission outruns the
enumeration. In print this standalone pattern is carried by the observe → react stack through its WATCH
member (the typed event bus), so the depth is not double-placed; the full pattern lives online.

*Flagship member (short):*

- **[deploy heartbeats](agent/lifecycle-and-observability/deploy-heartbeats.md) — progress-liveness facet.**
  A periodic beat whose *absence* for N windows reads deterministically as stale, so a silent hang becomes a
  positive signal rather than an unbounded wait. Deep dive →
  [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt appendix).

*Deep dive:* [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt appendix) — its
WATCH member.
*Related:* Bridge — [Encoded Operational Judgment](#cap-govern) (the playbooks it binds to) · Consumer —
[Staged Admission Gates](#cap-admit) (a signal promoted to a barrier).

### [Point-of-Action Policy Delivery](agent/lifecycle-and-observability/lifecycle-hooks.md) · principle P5

**Intent.** Deliver the constraint that governs an action to the actor at the moment of action, so a
runtime lifecycle event fires the check deterministically — policy converted from available-if-pulled to
binding-because-pushed.

**Vivid failure.** A step owed at a runtime moment depended on the actor remembering it, and was silently
skipped.

**Solution.** Lifecycle hooks — turn-stop, compaction, session-start, pre-action — split into a guaranteed
firing and a payload that either blocks or aims.

**Guarantee.** The firing is deterministic: the hook runs whether or not the actor remembers, so a pushed
policy binds where a pullable one was skipped. The boundary: the *firing* is hard; a payload that merely
*aims* (a nudge) still depends on the actor heeding it.

**Forces &amp; limits.** Hooks fire on a cadence, so a payload must respect an attention budget or the
delivery becomes noise the actor learns to ignore. Split guaranteed-firing from blocks-or-aims so the hard
part stays hard and the soft part stays honestly soft.

*Flagship members (short):*

- **[dynamic context injection](agent/context-and-dispatch/dynamic-context-injection.md) — feed-forward
  facet.** Slice the meta-substrate to just the rules governing the change-target and push them forward at
  the point of action, so the actor meets exactly the policy its edit implicates. Deep dive →
  [the context-delivery stack](book/appendix-a-context-delivery-stack.html) (alt appendix).
- **[the reflection-facet substrate](agent/lifecycle-and-observability/reflection-facet-substrate.md) —
  feed-back facet.** Soft nudges fed back under one shared attention budget — kept deliberately as the
  book's durable-versus-transient exemplar, a design whose *shape* outlasts the particular 2026 harness it
  runs on. Deep dive → [the context-delivery stack](book/appendix-a-context-delivery-stack.html) (alt
  appendix).

*Deep dive:* [the context-delivery stack](book/appendix-a-context-delivery-stack.html) (alt appendix) —
lifecycle hooks are its HOOK member.
*Related:* Enabler — [Governed Knowledge Base](#cap-govern) (the substrate it slices) · Sibling —
[Fleet Observability Surface](#cap-manage) (both hang off the runtime lifecycle).
*Known uses in the literature:* that agent capability rides on delivered structure, not prompt prose, is
convergent — Lin and colleagues' ablation of an auto-evolving coding-agent harness (2026) localizes the
gain to tools, middleware, and long-term memory rather than the system prompt. Our operationalization
pushes the rules governing an action to the actor at the moment of action (dynamic context injection),
delivering the knowledge through the environment rather than hoping the prompt carried it.

<a id="cap-govern"></a>
## GOVERN · Govern the control machinery itself

*Model, cover, and encode the governance system as its own subject.*

### [Governance Graph](models-bridge/system-models/governance-graph.md) · principle P7

**Intent.** Model the control system itself — governance mechanisms as typed conflict edges over a closed
shared-resource vocabulary — so a proposed control's collisions are checkable at authoring, not at the
tripwire.

**Vivid failure.** Two controls claimed the same slot with no ordering, colliding only when both fired in
production.

**Solution.** A typed interaction model in which mechanically-decidable conflict classes are caught by
construction.

**Guarantee.** A collision in a decidable conflict class is caught when the control is authored, before it
can fire against a sibling. The boundary: it decides the conflict classes the vocabulary expresses — a
collision outside the modeled resource set is not seen.

**Forces &amp; limits.** The shared-resource vocabulary must be closed and maintained, or a new resource
type opens an unmodeled collision channel. Modeling the control machinery is worth it only once controls
proliferate — for a handful, the graph is ceremony.

*Flagship member (short):*

- **[the control-coverage census](models-bridge/system-models/control-coverage-census.md) — coverage-lens
  facet.** The same governance-of-governance subject read for *coverage* rather than conflict: which
  failure classes have a control and which sit uncovered. Deep dive →
  [the governance-conversion stack](book/appendix-a-governance-conversion-stack.html) (alt appendix).
- **[the orphan-coverage metric](models-bridge/system-models/orphan-coverage-metric.md) — inverse-walk
  facet.** The same coverage subject walked the other direction: point a tracer at the *code* and score the
  sites no model or control reaches, so an un-governed region surfaces as a ranked orphan cluster rather
  than an empty target cell. The census asks which target is thin; this asks which code is un-covered.

*Deep dive:* [the governance-conversion stack](book/appendix-a-governance-conversion-stack.html) (alt
appendix) — its GRAPH member.
*Related:* Sibling — [Computed Control Blast Radius](#cap-govern) · Consumer —
[Governed Knowledge Base](#cap-govern).

### [Computed Control Blast Radius](models-bridge/system-models/control-substrate-dependency.md) · principle P7

**Intent.** Have every control declare the substrate assumption it bakes in as a typed fact, so "what
breaks when I change this substrate" is a computed query before the change, not archaeology after.

**Vivid failure.** A substrate migration silently broke controls whose dependency on it lived only in
someone's memory.

**Solution.** Per-control typed substrate declarations; blast radius is a query over them.

**Guarantee.** The set of controls a substrate change breaks is computable before the change. The boundary:
it computes over *declared* dependencies — an undeclared assumption is invisible to the query, so the
declaration discipline is the load-bearing part.

**Forces &amp; limits.** A declaration that drifts from the control's real assumption computes a false
radius, so the fact must be co-located with the control it describes. This is both a standalone catalogue
pattern and the RADIUS member of the six-part governance-of-governance stack: the stack *expanded* to add
self-governance as its INTERPRET member, it did not swap blast-radius out.

*Deep dive:* [the governance-conversion stack](book/appendix-a-governance-conversion-stack.html)
(alt appendix) — its RADIUS member, computing what a substrate change breaks across the estate.
*Related:* Sibling — [Governance Graph](#cap-govern) (conflict vs. dependency lens on the same estate).

### [Governed Knowledge Base](agent/governance-doc-controls/claude-md-rule-index.md) · principle P7

**Intent.** Govern the document that carries the governance: the boot-context map of the rules must itself
be bounded, canonical — one home per rule — admission-gated, and mechanically enforced, because the
delivery vehicle for every converted failure is itself a control.

**Vivid failure.** The governance index grew unbounded and its citations rotted, so agents booted from a
map that no longer matched the rules.

**Solution.** A size-capped, admission-gated rule index with stable citable numbering and cross-reference
integrity lints. Its two lenses — the boot-context [docs hierarchy](agent/context-and-dispatch/docs-hierarchy.md)
and the rule index — are one artifact merged, not two mechanisms.

**Guarantee.** The index stays bounded, every rule has exactly one home, and no citation dangles across a
green build. The boundary: it governs the *index's* integrity, not whether each rule it carries is wise.

**Forces &amp; limits.** A size cap forces the hard question — does this rule earn its per-boot context cost?
— which is the point, but it means a genuinely new rule displaces an old one rather than accreting. The
index is read on every agent boot, so its bloat taxes the whole fleet.

*Deep dive:* the [governance-conversion stack](book/appendix-a-governance-conversion-stack.html) (its
INDEX member) and [the context-delivery stack](book/appendix-a-context-delivery-stack.html) (the same
INDEX, its boot-context lens) — a deliberate two-facet dual placement (alt appendix).
*Related:* Consumer — [Validated Dispatch](#cap-admit) + [Point-of-Action Policy Delivery](#cap-manage)
(both read the substrate it governs) · Enabler — [Self-governance](#cap-govern) (where converted failures
land).

### [Encoded Operational Judgment](agent/governance-doc-controls/operational-playbooks.md) · principle P7

**Intent.** Pre-reason each recurring operational situation once, when nothing is burning: encode the
trigger, the ordered steps, and the reflexes to avoid, leading with the positive model of how the substrate
runs healthy.

**Vivid failure.** An operator improvised a recovery under fire and took a reflex the situation punishes,
because the judgment lived in no one's reach at the moment of need.

**Solution.** Situation-keyed playbooks, plus an operator runbook generated from the lifecycle model with
every pointer reference-validated.

**Guarantee.** A recurring situation meets pre-reasoned steps rather than improvisation, and the runbook
cannot cite a stale pointer across a green build. The boundary: it encodes judgment for *known* situations —
a novel recurring failure needs a *new* control, which is self-governance's job.

**Forces &amp; limits.** A playbook rots if the substrate it describes drifts, which is why the runbook is
*generated* from the lifecycle model rather than hand-kept. Pre-reasoning costs effort spent on situations
that may not recur — a bet that the recurring ones are worth the up-front thought.

*Flagship member (short):*

- **[the operator runbook skill](agent/governance-doc-controls/operator-runbook-skill.md) —
  generated-projection facet.** The runbook as `f(lifecycle-model)`: symptom-indexed, positive-model-first,
  and regenerated so it cannot drift from the substrate it operates. Deep dive →
  [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt appendix).

*Deep dive:* [the observe → react stack](book/appendix-a-observe-react-stack.html) (alt appendix) — its
RESPOND member, bound to the Fleet Observability signals.
*Related:* Bridge — [Fleet Observability Surface](#cap-manage) (the signals it responds to) · Sibling —
[Self-governance](#cap-govern) (executes within the estate vs. grows it).

### [Self-governance](agent/governance-doc-controls/self-governance.md) · principle P5

**Intent.** Give the system permission to detect its own recurring issues and introduce *tasteful* —
proportionate, right-sized — controls that prevent their recurrence, rather than re-patching each instance.
When a failure recurs, classify the failure **class** and add the smallest durable guardrail that kills it.

**Vivid failure.** The same false-reject, the same mis-firing lint, the same manual step got re-patched
locally each time, so the class survived to bite the next agent — and on a long autonomous run even a team
that believes in converting the class forgets, because the trigger lives only in memory.

**Solution.** A loadable failure-interpretation skill (the conversion judgment) invoked by a turn-end
reflection hook that fires at most once per window — the soft judgment carried on a hard, deterministic
cadence. On a recurrence it names the class, then picks the durable control that kills it: a constraint
that makes the wrong move unrepresentable where one can be built, else a sensor that detects and fails it.

**Guarantee.** The conversion runs on a cadence, not on memory, so a recurring failure class reliably meets
the question "should this become a control?" The boundary: the hook's *firing* is hard; the *conversion* is
soft judgment — the skill proposes and scaffolds, it does not install the control.

**Forces &amp; limits.** The trigger must be a genuine recurrence, or the loop manufactures controls for
one-offs and the estate bloats — right-sizing is the taste the intent names. This is the generative engine
the whole catalogue is an output of: every entry here is, in effect, one conversion's output.

*Deep dive:* [the governance-conversion stack](book/appendix-a-governance-conversion-stack.html) (alt
appendix) — its INTERPRET member, the beating heart of governing the control machinery.
*Related:* Sibling — [the operator runbook skill](agent/governance-doc-controls/operator-runbook-skill.md)
(executes *within* the estate; self-governance *grows* it) · Enabler —
[Governed Knowledge Base](#cap-govern) (where each converted control lands).
*Known uses in the literature:* converting a recurring failure into a durable control is old practice —
Shingo's poka-yoke (1986) builds mistake-proofing into the fixture itself, and site-reliability
blameless-postmortem culture (Beyer et al., 2016) turns each incident into durable reliability work. Our
operationalization fires the conversion on a cadence — a turn-end reflection hook — so a recurring class
reliably meets the question "should this become a control?" rather than depending on whoever remembers.

<a id="folds"></a>
### Two borderline folds, kept as named variants

Two entries were folded, but their distinction is worth preserving, so each surfaces as a named variant
inside its parent.

- **Formal invariant verification** folds under **Model-Derived Assurance Coverage** as the *proof* pole
  against the census's *exercise* pole. It routes each invariant to the checker its temporal shape
  demands, proving a property across bounded interleavings or returning a counterexample. It composes with
  the Composed State-Machine Model — the model is the specification, this is the checker.
- **Model-graded finding severity** folds under **Read the Model, Don't Copy It** as a model-consuming
  gate. It computes a finding's severity as a function of the finding and the change, once, against the
  live component model — a strong instance of reading the model to grade, rather than a canonical
  mechanism of its own.

---

<a id="compositions"></a>
## The eight compositions

Some mechanisms are strong together. A composition is not a bigger pattern nor six unrelated ones; it is a
stack whose members reinforce each other.

- **The model-coherence stack** — [Executable Source of Truth](#cap-know) + [Drift / Parity
  Gate](#cap-sync) + [Read the Model, Don't Copy It](#cap-know). A model is authoritative only when it is
  read live and held equal to reality. The three together turn data-not-code into a source of truth that
  cannot silently drift. Derived Traceability is the highest rung — derive the join so parity is
  unnecessary.

- **The provenance and fidelity stack** — [One Door Enforced](#cap-constrain) + [Caused-By
  Provenance](#cap-provenance) + [Preservation Invariant](#cap-preserve). Routing every mutation through
  one door makes complete provenance feasible; stamps feed a derived changelog; the preservation invariant
  catches damage done through the sanctioned seam. Seam, stamps, wiring-lint, changelog, validator.

- **The specification and verification stack** — [Composed State-Machine Model](#cap-know) +
  [Model-Derived Assurance Coverage](#cap-complete). The composed model is the specification; formal
  invariant verification is the checker routed by the invariant's temporal shape. Spec plus prover, proven
  across interleavings or refuted by a counterexample.

- **The safe-launch stack** — [Validated Dispatch](#cap-admit) + [Closed Action Vocabulary](#cap-constrain).
  The dispatch lint validates the work order; role-typed authority fixes what the launched actor may do.
  Pre-authorization of autonomy is a well-formed order plus bounded authority.

- **The evidence staircase** — [Staged Admission Gates](#cap-admit) + [Re-Derived Definition of
  Done](#cap-complete). The pre-commit gate binds cheap checks to an exact tree so a later stage can check
  rather than trust; the re-derived Definition of Done recomputes the full evidence at close. Cheap
  evidence early, full re-derivation late, never a trusted self-report. *(Its narrative is developed in the
  book's validation chapter; both member patterns stay in the catalogue.)*

- **The observe-then-react loop** — [Fleet Observability Surface](#cap-manage) + [Encoded Operational
  Judgment](#cap-govern) + [Staged Admission Gates](#cap-admit). A typed event bus emits and interprets; a
  playbook binds each signal to a response; the cron-alerts gate promotes a critical signal into a barrier.
  Emit, interpret, react, gate.

- **The resource-mediation stack** — [Mediated Resource Admission](#cap-manage), with its folded
  adaptive-condition variant. Fixed-capacity mediation bounds the *count* of admitted heavy work; the
  adaptive-pressure variant folded under it bounds by the live *condition* of the host and sheds during, so
  one admission relation bounds compute on both axes.

- **The governance-of-governance stack** — [Governance Graph](#cap-govern) + [Computed Control Blast
  Radius](#cap-govern) + [Self-governance](#cap-govern) + [Governed Knowledge Base](#cap-govern). Once
  controls proliferate they become a system: the graph models their conflicts, the blast-radius model
  computes what a substrate change breaks across them, self-governance converts each recurring failure into
  a proportionate new control so the estate grows by design, and the governed knowledge base keeps the rule
  index that carries every control honest.

---

## How to read the rest

No system needs every entry. This page is the repertoire; the [full census](INDEX.md) lists every
mechanism by role and family, and each links to its full writeup. Choose by the failures, risks, and
assurance obligations of the system in front of you. If you cannot name the failure a mechanism prevents in
*your* system, you may not need it yet.
