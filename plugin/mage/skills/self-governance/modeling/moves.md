# modeling/moves — how representation improves

A **move** is a transferable engineering transformation: the verb by which you improve a poorly-represented
situation. This file answers one question — *what can I do to make engineering knowledge more explicit,
more authoritative, or more consequential?* It names the ten moves the book teaches, as verbs.

Keep the cut clean. A model is a noun; the families live in [`repertoire.md`](repertoire.md). A move is a
verb; it lives here. A move is *selected* when you recognize a situation
([`../practice/situations.md`](../practice/situations.md)) and weigh whether it pays
([`../practice/judgment.md`](../practice/judgment.md)); it is *executed* through a capability
([`../skills/repertoire.md`](../skills/repertoire.md)). This file does not enumerate model types and does
not decide which move is warranted — it teaches what each verb *is*.

**A move is not a fourth activity in the method.** These are recurring realizations of Modeling and
Alignment: improve representation where knowledge is repeatedly reconstructed, add authority where an
obligation can be decided, make useful judgment durable when recurrence justifies its cost. The test of the
skill is not reproducing any one instance — it is recognizing, when your own system starts paying
repeatedly for the same problem, which move fits its shape.

## The cheat sheet

Recognize the recurring cost; reach for the move.

| Recurring cost | Move |
|---|---|
| many truths disagree | **make the fact authoritative** |
| copies drift from the authority | **derive; don't copy** |
| model and reality diverge | **check correspondence** |
| assurance has invisible holes | **derive the obligation set** |
| checks fire too early or too late | **put authority where it's legible** |
| actions evade governance | **close the action surface** |
| the rule exists but isn't present | **deliver knowledge at the decision** |
| the *why* is lost after the change | **carry cause with consequence** |
| operators reconstruct the same procedure | **externalize judgment** |
| changes have hidden dependents | **make dependencies queryable** |

## How to read a move

Each move below carries the same short record:

- **Verb** — the transformation, stated so it transfers to any domain.
- **Recognition cue** — the light symptom that surfaces it. The deep diagnosis lives in
  [`../practice/situations.md`](../practice/situations.md); this is only the tap on the shoulder.
- **Acts on** — the model family from [`repertoire.md`](repertoire.md) the move operates over.
- **Surface it can produce** — the alignment mechanism the move opens toward
  ([`../alignment/repertoire.md`](../alignment/repertoire.md)).
- **Pays when** — the economics that justify its carrying cost, weighed in
  [`../practice/judgment.md`](../practice/judgment.md).

An instance names one concrete realization for grounding. Different mechanisms can realize the same move —
that transfer is the point; hold the move constant and let the realizations look unalike.

---

## 1. Make the fact authoritative

- **Verb.** Choose one representation to carry a consequential fact, make it machine-readable, and give
  downstream artifacts less freedom to disagree than the upstream intent. Authority should be
  architectural, not conventional.
- **Recognition cue.** The same fact lives in six places and drifts; disagreement has become an ordinary
  system state.
- **Acts on.** Any family — most often *structure and boundaries* (a service relationship, an ownership
  fact) or *measurement* (a shared budget).
- **Surface it can produce.** A single source of truth that a correspondence check can hold against.
- **Pays when.** Several consumers already need the fact and can independently change their copy. *(Instance:
  a service-flow model from which network policy is generated, not separately remembered; a timeout-budget
  model whose nesting order is mechanically checked.)*

## 2. Derive; don't copy

- **Verb.** Consume an authoritative representation by query or generation at the point of use. Do not mint
  a second editable truth for convenience.
- **Recognition cue.** An authority exists, but consumers snapshot its values — the model is nominally
  authoritative while real decisions run against stale copies.
- **Acts on.** Whatever family holds the authoritative model; this move governs its *downstream* use.
- **Surface it can produce.** A live query surface, or a generated artifact re-emitted on change.
- **Pays when.** The fact changes and a snapshot would silently keep the old answer. This move is the
  necessary partner to *make the fact authoritative* — the first establishes authority, this preserves it.
  *(Instances: model-aware lints and briefs that read the live model rather than embedded values;
  configuration or documentation generated from the model as a derivative, not a maintained restatement.)*

## 3. Check correspondence

- **Verb.** Treat the agreement between a model and reality as an invariant, and check it in both
  directions — that modeled claims stay true of the system, and that consequential reality has not escaped
  the model's declared scope.
- **Recognition cue.** A trusted model has quietly gone stale; engineers reason confidently from a
  representation that no longer describes the system.
- **Acts on.** Any executable family — *structure*, *behavior*, *measurement* — that declares a property
  reality can violate.
- **Surface it can produce.** A drift or parity check — a sensor that fires when the two diverge, or a gate
  that blocks the diverging change.
- **Pays when.** The model earns enough trust that a silent divergence would mislead. The two directions
  catch different failures: one finds a wrong modeled fact, the other finds unmodeled reality. *(Instances:
  a component-and-zone gate comparing declared architecture against actual imports; an orphan-coverage walk
  starting from code and asking what governs it.)*

## 4. Derive the obligation set

- **Verb.** Compute what assurance *ought* to exist from the engineering representation, then compare the
  required set against the evidence actually present.
- **Recognition cue.** Assurance measures what you happen to have — tests written, lines covered — and so
  cannot reveal an obligation nobody thought to encode.
- **Acts on.** *Measurement* and any structured family that exposes seams, failure edges, and invariants
  from which obligations follow.
- **Surface it can produce.** A validator over the gap: a covered-versus-required census whose remainder is
  a finding.
- **Pays when.** The obligations are derivable from a model and a hand-maintained checklist would rot.
  *(Instances: a model-derived test-obligation census matched against the existing suite; a control-coverage
  census that surfaces governance targets with no control — same move, tests swapped for controls.)*

## 5. Put authority where it's legible

- **Verb.** Enforce at the earliest boundary that can honestly decide the property — and, when later work
  can invalidate that evidence, re-establish the check at the last boundary before consequence.
- **Recognition cue.** A check fires at a convenient point rather than a capable one: too early, before the
  property exists, or too late, after avoidable cost; or evidence goes stale between the check and the
  action it justified.
- **Acts on.** *Representation to authority* — it places the enforcement of an already-represented
  obligation.
- **Surface it can produce.** A gate at the earliest-legible boundary, re-run at the point of no return.
- **Pays when.** Intervening change — another commit, an integration step, a deploy transition — can
  invalidate an earlier pass (the broad time-of-check/time-of-use hazard). *(Instances: a sentinel check at
  an agent's first meaningful commit — early enough to abort a bad trajectory, late enough that an artifact
  exists to judge; a definition-of-done that re-runs the required checks against the merged head before
  closure.)*

## 6. Close the action surface

- **Verb.** Route a consequential operation through a bounded, named interface, so an open-ended set of
  moves becomes a finite one that can each carry policy, evidence, and validation.
- **Recognition cue.** A powerful operation can happen through arbitrary routes, and every validator or
  provenance mechanism must reason about all of them.
- **Acts on.** *Structure and boundaries* — it declares the single door onto a powerful surface.
- **Surface it can produce.** A constraint that scopes the action space, plus a ban on the raw alternative.
- **Pays when.** Governance over the operation is otherwise unstatable because the move set is unbounded.
  *(Instances: a closed set of named mutator verbs, each required to stamp provenance and participate in
  validation; a single sanctioned seam onto a raw datastore so queue semantics are encoded once.)*

## 7. Deliver knowledge at the decision

- **Verb.** Bind the relevant knowledge to the work surface where the decision is made, so discovery is a
  property of the environment rather than a test of memory or search.
- **Recognition cue.** A rule is perfectly documented and still ignored — the actor did not encounter it
  while deciding; "the agent could have found it" is weakening as the corpus grows.
- **Acts on.** *Documentation and provenance*, delivered into the decision context; pairs with the loop's
  routing.
- **Surface it can produce.** A context-injection hook, or an admission check that the needed knowledge is
  present before work begins.
- **Pays when.** The knowledge base has grown past what an actor will reliably retrieve unprompted.
  *(Instances: injecting the rules that govern the files in a task into the task's brief; brief-linting that
  refuses to launch work whose brief lacks the required context.)*

## 8. Carry cause with consequence

- **Verb.** Mint provenance at the causal event and carry it forward with the resulting change; prefer
  provenance whose completeness can itself be checked.
- **Recognition cue.** The final state shows *what* changed but has lost *why*; reconstructing causality
  after the fact is expensive and ambiguous.
- **Acts on.** *Documentation and provenance*.
- **Surface it can produce.** A validator that fails when a sanctioned change lacks its attribution —
  provenance completeness as an invariant, not a convention.
- **Pays when.** Work propagates through commits, generated artifacts, and transforms that would otherwise
  strip the origin. *(Instances: a typed caused-by relation connecting a change to its originating task,
  gated at commit; per-mutator stamps from which a changelog is reconstructed.)*

## 9. Externalize judgment

- **Verb.** Represent recurring operational or engineering judgment explicitly enough that a future human
  or agent can execute or reason through it — and keep the representation tied to the system it describes,
  separating what can be derived or executed from what still needs contextual judgment.
- **Recognition cue.** You keep re-deriving the same thing from source; competent operators reconstruct the
  same diagnosis — what healthy looks like, what a symptom means, which procedure applies — every time.
- **Acts on.** *Behavior and ownership* (a lifecycle whose healthy-state predicates generate the
  procedure), and any implicit knowledge worth making explicit.
- **Surface it can produce.** A generated runbook, or an event-bound playbook whose trigger and response
  are externalized rather than reconstructed.
- **Pays when.** The judgment recurs and its reconstruction cost outweighs the cost of representing it.
  This is the foundational move — moving knowledge from implicit to explicit is the first rung of the
  authority ladder in [`repertoire.md`](repertoire.md). *(Instances: a lifecycle model that names
  subsystems and their healthy-state predicates and generates the operator runbook; per-topic playbooks a
  reactor fires on typed events.)*

## 10. Make dependencies queryable

- **Verb.** Represent consequential dependencies explicitly enough that change impact can be *queried*
  before the change lands, instead of grepped-and-read after it breaks something.
- **Recognition cue.** A cross-cutting change breaks a control whose assumption was buried in
  implementation — the dependency was invisible until the substrate moved.
- **Acts on.** *Documentation and provenance* (traceability edges) and *structure* (declared dependency
  metadata).
- **Surface it can produce.** A queryable dependency graph — "what depends on X?" becomes a query, and a
  computed blast radius becomes a sensor.
- **Pays when.** Controls or artifacts encode assumptions about a substrate that will change under them.
  *(Instances: controls that declare their substrate assumption as typed metadata, so a migration's blast
  radius is computed; a symbol-anchored traceability graph joining models, lints, code, and evidence
  through re-checked edges.)*

---

## Where to go next

- **The model families these verbs act on** — [`repertoire.md`](repertoire.md).
- **Recognizing which move a symptom calls for** — [`../practice/situations.md`](../practice/situations.md).
- **Deciding whether a move pays** — [`../practice/judgment.md`](../practice/judgment.md).
- **Turning the surface a move opens into an enforced control** — [`../alignment/repertoire.md`](../alignment/repertoire.md).
- **Making a recurring failure durable** — [`../learning/governance-conversion.md`](../learning/governance-conversion.md).

## Owns / does not own

- **Owns** the move *verbs* — the transformations that improve representation and open a path to authority.
- **Does not own** the model taxonomy ([`repertoire.md`](repertoire.md)), move *selection* under competing
  alternatives ([`../practice/judgment.md`](../practice/judgment.md)), or situation recognition
  ([`../practice/situations.md`](../practice/situations.md)).
