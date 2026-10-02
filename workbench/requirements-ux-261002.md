Yes. I would make this a normative HUMAN-UX.md, and I would add a system model specifically to prevent the architecture from drifting into “the machine interface can do more than the human interface” or vice versa.

The governing idea should be:

MAGE is a workbench over one authoritative engineering model. The canvas, inspector, structured source, query interface, validation interface, and coding agent are alternative interfaces onto the same model semantics. None is an independent representation of the system.

That also fits the broader lesson from the DocAble work: UX affordances need to reflect the domain model rather than merely provide generic editing gestures.

HUMAN-UX.md

Human interaction specification for the MAGE Model Workbench

1. Purpose

The MAGE Workbench SHALL provide a complete human interface for constructing, inspecting, modifying, querying, validating, and reasoning about purposeful engineering models.

The human interface is not a visualization layered over an agent-oriented modeling engine. A user SHALL be able to perform the ordinary modeling workflow without an agent.

Conversely, the agent SHALL operate the same authoritative model and semantic operations exposed through the human interface.

The principal interaction loop is:

Create → Connect → Inspect → Query → Interpret → Revise

An agent provides an additional route through the same loop:

Describe → Agent proposes → Inspect diff → Accept/reject
                                      ↓
                         same authoritative model

The workbench SHALL make the relationship between models and engineering questions visible. It should encourage construction of the smallest model adequate to answer the question rather than comprehensive specification.

⸻

2. One model, multiple interfaces

The architecture SHALL maintain exactly one authoritative semantic workspace state.

                    Authoritative MAGE IR
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
       Canvas          Inspector          Source
          │                │                 │
          ├────────────────┼─────────────────┤
          │                │                 │
          ▼                ▼                 ▼
       Queries         Validation          Agent

All interfaces SHALL invoke the same application services.

There SHALL NOT be:

* a diagram model separate from the semantic model;
* an agent model separate from the human model;
* source text that silently diverges from the graphical representation;
* query semantics available only through the agent;
* semantic operations available only through graphical gestures.

Views may contain non-semantic state such as positions, zoom, selection, collapsed groups, and open panels. Those are not part of the modeled engineering system.

⸻

3. Primary workbench layout

The default workbench SHOULD have four conceptual regions:

┌──────────────┬──────────────────────────────┬──────────────────┐
│              │                              │                  │
│ Models       │                              │ Inspector        │
│              │          Canvas              │                  │
│ Structural   │                              │ Properties       │
│ Lifecycle    │                              │ Relations        │
│ Performance  │                              │ Quantities       │
│ Requirements │                              │ Purpose          │
│              │                              │                  │
├──────────────┴──────────────────────────────┴──────────────────┤
│ Query / validation / evidence                                 │
└────────────────────────────────────────────────────────────────┘

Exact geometry is not normative. The functional regions are.

A source view may replace or accompany the canvas when requested.

The interface SHALL remain usable at ordinary laptop dimensions and browser zoom levels required for accessibility.

⸻

4. Canonical workflow 1: create a model from an empty workbench

A user SHALL be able to create a complete simple model using only the human interface.

Starting from an empty workspace:

1. User chooses Add model.
2. Workbench offers supported model types.
3. User selects, for example, State machine.
4. Workbench requests a name and optionally an engineering question.
5. Empty model appears.
6. User chooses Add state, or invokes the equivalent keyboard command.
7. User names the state.
8. User repeats as needed.
9. User marks an initial state.
10. User creates transitions.
11. Workbench continuously validates the model.

For a structural model, the analogous workflow creates entities and typed relations.

The UI SHALL NOT require the user to know YAML, RDF, SPARQL, stable IDs, or SMT representations.

Creation affordances

At minimum:

* Add model
* Add element
* context-sensitive canvas creation;
* keyboard-accessible equivalent;
* command/search palette equivalent.

The available element types SHALL derive from the typed MAGE IR/schema, not a separately maintained UI catalogue.

⸻

5. Canonical workflow 2: create a relationship

The user selects or initiates a connection between two model elements.

The workbench SHALL determine which relationship types are licensed by the semantic IR.

Example:

Remediation Service  ──────────────>  Model Gateway
                       ▼
                 May invoke
                 Depends on
                 Sends data to

Only relationships valid for the source, target, and current model type SHALL be offered.

This is important:

The UI SHALL derive affordance licensing from the same semantic rules used by validation.

An illegal relationship SHOULD normally be prevented when the invalidity is knowable before creation.

For example, if contains requires an entity target and the selected target is a quantitative parameter, contains should not be offered.

Where validity depends on information not yet supplied, creation may proceed into an incomplete/provisional state and validation SHALL identify what remains necessary.

The workbench should not routinely permit obviously illegal operations merely so that a validator can complain afterward.

⸻

6. Canonical workflow 3: inspect and edit

Selecting any semantic element SHALL make its represented properties inspectable without requiring source editing.

For an entity:

Model Gateway
────────────────────
Type        Service
Sensitivity Public
Latency     100–500 ms
Relations
← may-invoke  Remediation
Appears in
Service Flow
Data Policy
Performance

For a state-machine transition:

processing → failed
────────────────────
Guard
  retry_count < 3
Effects
  retry_count := retry_count + 1
Latency
  20 ms

The inspector SHALL expose only properties licensed for that semantic type.

Editing through the inspector SHALL create the same semantic transaction that an agent or source edit would create.

⸻

7. Canonical workflow 4: cross-model identity

When an entity occurs in multiple purposeful models, the workbench SHALL make shared identity apparent.

Selecting Model Gateway in the service-flow model should permit the user to discover that the same entity participates in:

* deployment;
* data policy;
* performance;
* other relevant models.

The user SHALL be able to navigate among those appearances.

The UI SHOULD distinguish:

same entity, different model

from:

different entities with similar labels

Labels are not identities.

This makes model composition visible rather than leaving it as an RDF implementation fact.

⸻

8. Canonical workflow 5: query from context

The human interface SHALL support querying without requiring SPARQL.

Selection provides context.

For example, selecting Remediation and Gateway might expose:

Ask about these elements

* Can Remediation reach Gateway?
* What paths connect them?
* What must occur before Gateway?
* Can this relationship recur?
* What requirements involve these elements?

Available query affordances SHALL be derived from the semantic types and supported analysis capabilities.

The user may also enter a natural-language engineering question if an external agent is available, but core deterministic query functionality SHALL NOT require an LLM.

An advanced interface MAY expose the generated SPARQL.

⸻

9. Canonical workflow 6: inspect evidence

A query result SHALL be connected visibly to the model from which it was derived.

For:

Can published be reached without reviewed?

a counterexample or witness SHALL be shown both textually and graphically:

waiting → processing → failed → waiting
                     → processing → published

The corresponding states and transitions are highlighted on the canvas.

The evidence panel SHALL expose:

* result status;
* proposition evaluated;
* witness/counterexample;
* coverage;
* assumptions/bounds;
* relevant models;
* quantitative derivation where applicable.

For a structural path query, highlight the path.

For a quantitative result, show the relevant quantities and derivation.

For an SMT-backed result, translate solver assignments back into model entities, states, transitions, quantities and parameter values. Solver variables are not the primary evidence representation.

⸻

10. Canonical workflow 7: not answerable

If the model does not preserve a distinction required by the question, the human interface SHALL present that as a modeling result.

Example:

Can restricted document contents reach Model Gateway?

The workbench may display:

Cannot answer from the current models
Represented
✓ permitted invocation
✓ data classification
Missing
○ payload propagation
The service-flow model tells us which calls are permitted,
but not what data those calls carry.

Where practical, the interface SHOULD offer a semantically appropriate next action:

Add payload distinction

It SHALL NOT fabricate an answer from nearby represented facts.

This is a first-class workflow, not an error condition.

⸻

11. Canonical workflow 8: validation and repair

Validation occurs continuously after semantic changes.

The workbench distinguishes:

* operations that can be prevented because they are intrinsically invalid;
* incomplete constructions that need additional information;
* cross-model inconsistencies detectable only after construction.

Validation findings SHALL identify:

1. the violated semantic rule;
2. affected model elements;
3. why the construction is invalid;
4. available repair actions where these can be determined safely.

Selecting a validation finding SHALL focus the relevant model element.

For example:

V7 — Invalid relationship
may-invoke requires:
  source: invocable entity
  target: invocable entity
Target `retry_count` is a variable.

The UI and agent API SHALL use the same validation result.

⸻

12. Canonical workflow 9: graphical/source round trip

The user SHALL be able to inspect and, where enabled, edit the structured MAGE source.

The invariant is:

canvas edit
     ↓
semantic transaction
     ↓
authoritative MAGE IR
     ↓
source + RDF + canvas update

and:

source edit
     ↓
parse + normalize + validate
     ↓
authoritative MAGE IR
     ↓
RDF + canvas + inspector update

There is no graphical-to-source “export” operation because they are not independent artifacts.

If source is temporarily syntactically invalid, the workbench MAY retain the draft source while continuing to display the last valid semantic model. It SHALL clearly indicate that the draft has not become authoritative.

⸻

13. Canonical workflow 10: collaborate with an agent

The student works with an external coding agent while the MAGE workbench remains visible.

Example request:

Add a 128 MB cache before Model Gateway and see whether we can stay below 400 ms without exceeding the memory requirement.

The agent:

1. discovers window.mage;
2. inspects the current semantic context;
3. proposes a transaction;
4. creates a hypothesis;
5. MAGE renders the proposed change;
6. MAGE visibly distinguishes it as hypothetical;
7. agent executes deterministic queries;
8. evidence appears in the ordinary workbench;
9. agent explains the evidence;
10. human chooses to accept, revise, or discard.

The human SHALL NOT need to copy stable IDs, YAML, SPARQL, JSON, or solver expressions between the workbench and agent.

⸻

14. Agent changes require reviewable hypotheses

A consequential agent model edit SHOULD normally enter as a hypothesis rather than silently mutate the authoritative model.

The UI SHALL visibly distinguish:

AUTHORITATIVE
Remediation → Gateway
HYPOTHETICAL
Remediation → Cache → Gateway

The human can:

* inspect;
* query;
* compare;
* revise;
* accept;
* discard.

Acceptance uses the ordinary transaction mechanism.

There is no separate “AI model.”

⸻

15. Query and editing symmetry

Anything semantically selectable should be queryable where meaningful.

Anything semantically editable should expose an appropriate editing affordance.

Anything returned as evidence should be navigable back to the corresponding model elements.

This creates the interaction invariant:

model element
   ↕
canvas
   ↕
inspector
   ↕
source
   ↕
query evidence
   ↕
agent

Not every representation must expose every operation in identical form. It must expose the same semantic capability where that capability makes sense.

⸻

16. Keyboard and accessibility interaction

Every human workflow specified above SHALL have a keyboard-accessible path.

The canvas SHALL NOT be the only way to construct or navigate a model.

For example, a keyboard/screen-reader user must be able to:

* add a model;
* add an entity/state;
* connect elements;
* inspect relationships;
* modify properties;
* execute queries;
* traverse evidence;
* review an agent hypothesis;
* accept/discard changes.

A structured model tree/list therefore serves as a full semantic interaction surface, not merely an accessibility description of the picture.

Buttons SHALL have accessible names. Compound widgets SHALL expose appropriate roles, states and keyboard behavior. Focus SHALL move deliberately, not opportunistically.

Graphical highlighting SHALL always have a textual/semantic equivalent.

⸻

17. Progressive disclosure

MAGE should remain simpler than conventional UML tools.

Creating:

A → B

should not immediately expose dozens of UML properties.

The inspector shows the minimum useful properties first.

Advanced distinctions appear only when the model or question requires them.

This follows the modeling philosophy itself:

Preserve distinctions because they matter to an engineering question, not because the modeling language happens to possess them.

⸻

18. Undo and redo

All committed human and agent semantic transactions SHALL participate in one undo/redo history.

The history might read:

Add state `reviewed`
Add transition processing → reviewed
Set retry_count range to [0,3]
Agent: add cache hypothesis
Accept cache hypothesis

Agent operations do not get a privileged second history.

View-only actions such as pan, zoom, selection, and opening an inspector need not enter semantic history.

⸻

19. Interaction feedback

Every user action should produce an observable consequence appropriate to its kind.

Examples:

create entity       → entity appears
connect elements    → relation appears
invalid connection  → operation unavailable or finding appears
select entity       → inspector changes
run query           → result/evidence appears
select evidence     → relevant model elements highlight
agent hypothesis    → visible model diff
accept hypothesis   → hypothetical treatment disappears

There should be no consequential “invisible success.”

This applies equally to agent operations.

⸻

20. No hidden machine-only semantics

This should be a hard architectural requirement.

Every semantic construct and operation supported by the MAGE model kernel SHALL have both a machine-accessible affordance and a human-accessible affordance.

The affordances need not be identical.

For example:

Capability	Human	Machine
Create entity	Add element	transaction
Create relation	connect UI	transaction
Set property	inspector	transaction
Inspect model	canvas/tree/inspector	semantic IR
Query graph	query UI	SPARQL
Run analysis	query UI	analysis API
Inspect witness	evidence panel/highlight	structured evidence
Validate	findings UI	validation result
Create hypothesis	review UI	hypothesis API
Commit	Accept	commit
Undo	Undo control	undo
Export	Export control	export API

Likewise, there SHALL NOT be a human-only semantic operation implemented as arbitrary canvas mutation that cannot be represented through the machine interface.

⸻

21. System model: interface affordance invariant

I would add a new dogfooding model under system-models/, probably:

system-models/interface-affordances.mage.yaml

This should model semantic capabilities, not individual buttons.

Conceptually:

                 Semantic Capability
                         │
          ┌──────────────┴──────────────┐
          │                             │
    Human Affordance              Machine Affordance
          │                             │
 canvas / inspector /             window.mage /
 source / query UI                SPARQL / transaction

Representative model:

model:
  id: interface-affordances
  type: structural
  question: >
    Does every supported semantic capability have both a human
    and machine affordance over the same application service?
entities:
  create-element:
    type: semantic-capability
  create-relation:
    type: semantic-capability
  edit-property:
    type: semantic-capability
  validate:
    type: semantic-capability
  query:
    type: semantic-capability
  inspect-evidence:
    type: semantic-capability
  hypothesize:
    type: semantic-capability
  commit:
    type: semantic-capability
  human-interface:
    type: interface
  machine-interface:
    type: interface
relations:
  - type: afforded-by
    from: create-element
    to: human-interface
  - type: afforded-by
    from: create-element
    to: machine-interface
  # ...same pattern for every semantic capability

But I would go one step further and make this derived from a capability registry, rather than maintaining the list manually.

⸻

22. Capability registry

The application should possess one typed registry of semantic capabilities:

create-model
delete-model
create-element
delete-element
create-relation
delete-relation
edit-property
inspect
validate
query
analyze
inspect-evidence
create-hypothesis
commit-hypothesis
discard-hypothesis
undo
redo
import
export

For each capability, register its implementations:

capability: create-relation
service:
  relation-service.create
human:
  - canvas.connect
  - inspector.add-relation
  - keyboard.add-relation
machine:
  - transaction.add-relation

The registry can drive:

* window.mage.describe();
* UI capability tests;
* accessibility tests;
* system-model generation;
* documentation;
* CI invariants.

This is better than keeping a manually synchronized checklist.

⸻

23. Normative invariant

I would name this explicitly:

UX-I1 — Semantic affordance parity

For every public semantic capability c supported by the MAGE Workbench, there SHALL exist at least one human-accessible affordance H(c) and at least one machine-accessible affordance M(c). Both SHALL invoke the same underlying application service or transaction semantics and SHALL operate on the same authoritative MAGE IR.

Formally:

\forall c \in C_{\text{semantic}}:
\exists h \in H(c) \land \exists m \in M(c)

and:

Semantics(h)=Semantics(m)=Semantics(c)

This is stronger than “both interfaces have a feature with the same name.”

They must converge on the same semantic operation.

⸻

24. A second invariant is worthwhile

UX-I2 — Evidence parity

Every semantic result available to a machine client SHALL have a human-perceivable representation, and every human-visible semantic result SHALL be available in structured machine-readable form.

So if the machine receives:

{
  "status": "counterexample-found",
  "evidence": {...}
}

the user gets an evidence panel and model highlighting.

Conversely, if the UI displays “Requirement violated,” that status and its evidence must exist in the structured result.

No UI-only conclusions.

No agent-only conclusions.

⸻

25. And a third catches diagram-editor drift

UX-I3 — Authoritative-state convergence

Every successful semantic edit, regardless of whether initiated through graphical interaction, inspector editing, structured source, import, or agent transaction, SHALL normalize to the same typed MAGE IR and cause all other semantic projections to update from that IR.

In other words:

             mouse
               │
keyboard ──────┤
               │
inspector ─────┤
               ▼
        application service
               ↓
          MAGE transaction
               ↓
       authoritative MAGE IR
        ┌──────┼──────┬───────┐
        ↓      ↓      ↓       ↓
      RDF    canvas  source  queries

Never:

canvas ↔ YAML ↔ RDF ↔ agent state

as peer representations attempting to synchronize themselves.

⸻

26. CI should enforce this

The system-models/interface-affordances model should not merely document the architecture. CI should query it or, preferably, regenerate it from the capability registry and assert:

semantic capability
AND NOT human affordance
    → FAIL
semantic capability
AND NOT machine affordance
    → FAIL
human semantic affordance
AND NOT semantic capability
    → FAIL
machine semantic affordance
AND NOT semantic capability
    → FAIL

There is a nice bit of MAGE dogfooding here: the model exists to answer an engineering question about MAGE itself:

Can a human and a coding agent exercise every semantic capability of the workbench through their respective interfaces without creating divergent model semantics?

That’s exactly the kind of model we want students to learn to make: small, purposeful, and tied to a consequential property.

⸻

Acceptance scenario

I would make one end-to-end scenario release-blocking.

Start from an empty workbench. Without an agent, a keyboard/mouse user creates two services, connects them with may-invoke, adds a performance annotation, runs a reachability query, sees the witness, changes the model, and sees the query result update.

Then attach an agent. Ask:

“Add a cache between these services as a hypothesis and determine whether the latency requirement still holds.”

The agent operates the same model. The human sees the proposed cache, evidence, and requirement result. The human accepts it using the UI. The agent immediately observes the committed state.

Then edit one property through structured source. Canvas, inspector, RDF query results, and agent context all reflect the same new semantic revision.

If we can do that, we haven’t built “a diagram editor with AI.” We’ve built the workbench we’ve been describing.
