Below is how I would land this as HUMAN-UX.md. It incorporates the earlier interaction requirements plus the decision we just made: A/C is the primary interaction model, with linked/system visualization as an inspection mode rather than the organizing UX.

MAGE Workbench Human UX Specification

1. Purpose

The MAGE Workbench is an interactive environment for constructing, inspecting, querying, and revising purposeful models of software systems.

The workbench is not primarily a diagram editor. It is an environment for using models to answer engineering questions.

The principal conceptual chain is:

\boxed{\text{Purpose} \rightarrow \text{Model} \rightarrow \text{Property} \rightarrow \text{Evidence}}

A model exists because some engineering question requires particular distinctions to be represented. Properties express consequential claims that can be evaluated using those models. Evidence explains why a property is established, refuted, conditional, inconclusive, or not answerable.

The human interface SHALL keep these relationships visible.

⸻

2. Governing interaction principle

MAGE is a workbench over one authoritative engineering model system. The canvas, inspector, structured source, property interface, query interface, evidence interface, and coding agent are alternative interfaces onto the same model semantics. None is an independent representation of the system.

The human interface SHALL be complete without an agent.

An external coding agent SHALL operate on the same authoritative model system and through the same semantic operations as the human interface.

The principal human interaction loop is:

PURPOSE
   ↓
MODEL
   ↓
QUERY
   ↓
EVIDENCE
   ↓
JUDGMENT
   ↓
REVISE

Persistent engineering claims add another loop:

MODEL(S)
   ↓
PROPERTY
   ↓
EVALUATION
   ↓
EVIDENCE
   ↓
REVISE MODEL(S)
   ↓
RE-EVALUATE

⸻

3. Principal objects

The workbench SHALL make four objects first-class in the human interface.

3.1 Model system

A model system is the workspace-level collection of purposeful models, properties, requirements, notes, provenance, and shared identities describing a software system.

Examples include:

* Message Bus
* Document Processing
* Worker Queue

3.2 Purposeful model

A model is a purposeful reduction of the modeled system.

Every model SHALL expose:

* name;
* engineering purpose or question;
* represented distinctions;
* deliberately omitted distinctions;
* model contents;
* notes;
* provenance.

A model SHALL NOT normally be presented merely by its notation or model type.

Prefer:

Event Flow
Which events may reach which consumers?

over:

Structural Model 1

The purpose is part of the normal presentation of the model, not metadata hidden in an advanced inspector.

3.3 Property

A property is a persistent engineering claim about the modeled system.

Examples:

✓ Publication requires validation
✗ Restricted data cannot reach Analytics
? Expected latency is below 400 ms

A property may depend on one model or several linked models.

Properties SHALL remain associated with the model system and SHALL be re-evaluated when relevant model semantics change.

3.4 Query

A query is an engineering question asked of the current model system.

Queries are ordinarily transient.

Examples:

Can restricted data reach Analytics?

What paths lead from queued to completed?

What gateway latency would satisfy the 750 ms requirement?

A query MAY be promoted to a persistent property when its resulting proposition is something the engineer wishes to continue evaluating.

3.5 Evidence

Evidence explains an analysis result in terms of the original model system.

Evidence may include:

* model elements;
* relations;
* paths;
* traces;
* configurations;
* counterexamples;
* quantitative derivations;
* assumptions;
* analysis bounds;
* relevant models;
* missing distinctions.

Solver variables and implementation-level analysis artifacts SHALL NOT substitute for model-level evidence.

⸻

4. Default workspace

The default desktop layout SHOULD follow this conceptual structure:

┌──────────────────────────────────────────────────────────────────────┐
│ MAGE   Message Bus                       Separate | Linked   + Model │
├──────────────────┬───────────────────────────────────────────────────┤
│ MODELS           │                                                   │
│                  │ Event Flow                                        │
│ Event Flow       │ Which events may reach which consumers?           │
│  events reach    │                                                   │
│  consumers       │                                                   │
│                  │                                                   │
│ Data Policy      │                MODEL WORKSPACE                    │
│  data services   │                                                   │
│  may process     │                                                   │
│                  │                                                   │
│ + Add model      │                                                   │
│                  │                                                   │
│ PROPERTIES       │                                                   │
│ ✓ Reachability   │                                                   │
│ ✗ Data safety    │                                                   │
│ ? Delivery       │                                                   │
├──────────────────┴───────────────────────────────────────────────────┤
│ QUERY / EVIDENCE                                                     │
│ > Can restricted data reach Analytics?                              │
│ ✗ Refuted · Counterexample found                       [Inspect]     │
└──────────────────────────────────────────────────────────────────────┘

Exact geometry is nonnormative.

The conceptual hierarchy is normative:

1. model system;
2. purposeful models;
3. properties;
4. model workspace;
5. query/evidence surface.

⸻

5. Models and their purposes

5.1 Purpose is persistently visible

Whenever a model is the principal model being viewed or edited, its purpose SHALL be displayed with it.

For example:

Event Flow
Which events may reach which consumers?
[model]
Represents
  permitted event publication and subscription
Omits
  runtime delivery
  delivery latency
  ordering guarantees

represents and omits need not occupy permanent screen area at all times, but they SHALL be directly inspectable without navigating away from the model.

5.2 Model selection

The model list SHALL show at minimum:

* model name;
* concise statement of purpose.

Selecting a model SHALL make that model the principal object in the workspace.

5.3 Model creation

A user SHALL be able to create a model without writing structured source.

The normal workflow is:

+ Add model
    ↓
Choose model type
    ↓
Name model
    ↓
State engineering purpose/question
    ↓
Create

The workbench MAY assist in specifying represents and omits, but these SHALL remain explicit model semantics rather than being inferred silently from the diagram.

⸻

6. Model workspace

The model workspace SHALL support three presentation modes.

6.1 Single

One purposeful model is shown.

This is the default editing mode.

6.2 Separate

Two or more purposeful models are displayed in separate panes.

Example:

┌─────────────────────────────┬─────────────────────────────┐
│ EVENT FLOW                  │ DATA POLICY                 │
│                             │                             │
│ OrderCreated                │ OrderCreated                │
│      │                      │      │                      │
│      ▼                      │      ▼                      │
│ Analytics                   │ shipping-address            │
│                             │ RESTRICTED                  │
└─────────────────────────────┴─────────────────────────────┘

Each pane retains its own model purpose.

Selection of a shared semantic entity SHOULD highlight its appearances in the other visible models.

6.3 Linked

Linked mode is an inspection mode, not the default modeling ontology.

It visually exposes semantic correspondence between purposeful models:

 EVENT FLOW                         DATA POLICY
 ┌──────────────┐                  ┌──────────────┐
 │ OrderCreated │══════════════════│ OrderCreated │
 └──────┬───────┘   SAME ENTITY    └──────┬───────┘
        │                                 │
   subscribes                         contains
        │                                 │
        ▼                                 ▼
 ┌───────────┐                     shipping-address
 │ Analytics │══════════════════╗          │
 └───────────┘                  ║      RESTRICTED
                                ║
                           SAME ENTITY

Linked mode SHALL NOT create a new semantic supermodel.

It is a visualization over shared identities and relations already present in the authoritative model system.

The workbench MAY automatically enter or suggest Linked mode when explaining a cross-model property.

⸻

7. Constructing and editing models

7.1 Add elements

Humans SHALL have direct affordances to create semantic elements.

Examples include:

* Add service
* Add entity
* Add state
* Add transition
* Add quantity
* Add requirement

These may be exposed through buttons, canvas interactions, keyboard commands, context menus, or a command palette.

7.2 Create relationships

The user SHALL be able to initiate a connection between semantic elements.

The workbench SHALL determine which relationship types are licensed by the typed model semantics.

Only applicable relationship types SHOULD be offered.

For example:

Checkout → OrderCreated
Create relationship:
  publishes

rather than presenting every relation known to MAGE.

7.3 Inspect and edit

Selecting an element SHALL expose an inspector appropriate to its semantic type.

For a transition:

Transition: retry
From       failed
To         queued
Guard      retry_count < 3
Effect     retry_count += 1
Latency    20 ms
Notes
...

The inspector SHALL expose semantic properties, not renderer-specific representation state.

⸻

8. Cross-model identity

Shared identity is a first-class interaction concept.

Selecting an entity that appears in several models SHALL permit the user to see its other appearances.

For example:

Analytics
Appears in:
  Event Flow
  Data Policy
  Deployment
[Show together]

The interface SHALL distinguish:

* the same entity represented in different models; from
* different entities with similar labels.

Labels are not identities.

The user SHALL be able to navigate among model appearances without knowing internal IDs.

⸻

9. Properties

9.1 Property list

The workspace SHALL provide a persistent property list.

Properties SHALL display their current evaluation status.

At minimum:

✓  ESTABLISHED
✗  REFUTED
◐  CONDITIONAL
?  NOT ANSWERABLE
…  INCONCLUSIVE

The exact icons are nonnormative and SHALL NOT be the sole means of communicating status.

9.2 Property dependencies

Every evaluated property SHALL identify the model or models upon which its evaluation depends.

For example:

Restricted data cannot reach Analytics
REFUTED
Uses:
  Event Flow
  Data Policy

Selecting the property SHOULD automatically arrange those models in the workspace.

A one-model property opens the relevant model.

A cross-model property opens the relevant models in Separate mode or an appropriate evidence-oriented Linked view.

The user should not need to know in advance which models to open.

9.3 Property inspection

Selecting a property SHALL expose:

* proposition;
* status;
* models used;
* evidence;
* analysis coverage;
* assumptions or bounds;
* last evaluation revision.

⸻

10. Queries

10.1 Query interface

The workbench SHALL provide a human-accessible way to execute supported queries without writing SPARQL.

Queries may originate from:

* a suggested query;
* a selected element;
* a selected relationship;
* a property;
* structured query controls;
* an external coding agent.

Examples of contextual actions include:

Can this reach...?
What can reach this?
What paths connect...?
Can this state recur?
What requirements involve this?

10.2 Query results

A query result SHALL include:

* answer/status;
* evidence;
* models used;
* coverage/bounds where relevant.

A bare Boolean is insufficient for consequential queries.

10.3 Save as property

Where meaningful, a query result SHALL offer:

Save as Property

This converts a transient engineering question into a persistent proposition evaluated against future revisions of the model system.

Conceptually:

QUERY
  "Can restricted data reach Analytics?"
                 ↓
RESULT
  "Yes: witness found."
                 ↓
SAVE AS PROPERTY
                 ↓
PROPERTY
  "Restricted data cannot reach Analytics"
  REFUTED

The system SHALL preserve the proposition’s semantics rather than merely saving the displayed answer.

⸻

11. Evidence

Evidence SHALL be both textual and navigable back into the models.

For a counterexample:

Restricted data cannot reach Analytics
REFUTED
Counterexample
OrderCreated
  contains shipping-address [RESTRICTED]
        ↓
Event Flow: Analytics subscribes to OrderCreated
        ↓
Data Policy: Analytics permits ≤ INTERNAL

Selecting evidence SHALL highlight the relevant semantic elements in the corresponding model panes.

For behavioral evidence, the workbench SHOULD animate or step through a trace when useful.

For quantitative evidence, it SHALL show enough derivation to explain the result:

Trace
  parse          50 ms
  remediate     100 ms
  gateway       500 ms
  validate       75 ms
                 ──────
                 725 ms

The UI SHALL distinguish evidence from explanation generated by an external agent.

⸻

12. Not answerable

NOT ANSWERABLE is a first-class result, not an error.

When possible, the interface SHALL explain which modeled distinction is missing.

Example:

Can restricted document content reach Model Gateway?
NOT ANSWERABLE
Relevant models
  Service Flow
  Data Classification
Known
  Remediation may invoke Model Gateway.
  Documents may contain restricted information.
Missing distinction
  What information is carried by the invocation.
[Open relevant models]
[Model payload propagation]

The workbench SHALL NOT fabricate an answer from information that the models deliberately omit.

This interaction is central to MAGE’s treatment of purposeful reduction.

⸻

13. Requirements

Requirements are persistent normative properties.

A requirement differs from an ordinary property because the engineer has declared that its satisfaction matters.

For example:

REQUIREMENTS
✗ Processing latency ≤ 750 ms
✓ Peak memory ≤ 512 MB
✓ Publication requires validation

A requirement SHALL use the same query, evaluation, and evidence machinery as other properties where possible.

The UX MAY distinguish requirements visually from descriptive properties, but they SHALL remain connected to their underlying proposition and evidence.

⸻

14. Notes, rationale, and provenance

Models and semantic elements SHALL support attached notes.

Initial note kinds SHOULD include:

* comment;
* rationale;
* assumption;
* question;
* todo.

Selecting a model or element SHALL expose its notes in the inspector.

Example:

NOTES
Rationale
This relation represents permitted invocation,
not an observed runtime call.
+ Add note

Notes are non-semantic.

Changing a note SHALL NOT change an analysis result.

If information in a note should constrain analysis, it must be represented through an appropriate semantic construct.

14.1 Provenance

Models and semantic transactions MAY retain provenance including:

* human or agent origin;
* creation time;
* originating prompt;
* transaction/revision;
* acceptance of an agent hypothesis.

For agent-created models, the specific instruction that produced the model or transaction SHOULD be inspectable.

The workbench SHOULD NOT automatically preserve an entire external agent conversation as model provenance.

⸻

15. Agent collaboration

The external coding agent SHALL interact with the same model system shown in the human interface.

A representative workflow is:

Human:
"Add a 128 MB cache before Gateway and determine whether
we remain below 400 ms without exceeding the memory limit."
             ↓
Agent inspects model system
             ↓
Agent creates hypothesis
             ↓
Human sees hypothetical model changes
             ↓
Agent executes deterministic analyses
             ↓
Evidence appears in normal MAGE evidence interface
             ↓
Human accepts / revises / discards

Consequential agent changes SHOULD ordinarily be reviewable as hypotheses rather than silently committed edits.

Hypothetical elements SHALL be visibly distinguishable from authoritative model elements.

⸻

16. Structured source

Structured source is another view of the same model system.

It SHALL NOT behave as a separate artifact requiring synchronization.

canvas edit
    ↓
semantic transaction
    ↓
authoritative MAGE IR
    ↓
source + RDF + canvas + queries update

and:

source edit
    ↓
parse
    ↓
normalize
    ↓
validate
    ↓
authoritative MAGE IR
    ↓
RDF + canvas + inspector + queries update

If source is temporarily syntactically or semantically invalid, the editor MAY retain a draft while the remainder of the workbench continues to display the last valid authoritative model. This state SHALL be clearly communicated.

⸻

17. Example model systems

The empty workspace SHALL provide direct access to the three default examples:

Create New Model System
Load Example
  Message Bus
  Document Processing
  Worker Queue
Import...

Every example SHALL contain at least two linked purposeful models.

Loading an example SHALL create an ordinary editable workspace.

Examples SHALL receive no privileged analysis, rendering, or editing behavior.

⸻

18. Progressive disclosure

MAGE SHOULD expose the minimum useful information for the current engineering question.

A relation should not expose dozens of UML-like attributes merely because they could theoretically exist.

Advanced distinctions become visible when:

* the model represents them;
* the engineering question requires them; or
* the user explicitly requests them.

The UX should therefore feel substantially lighter than a comprehensive UML/SysML environment.

⸻

19. Accessibility

The complete workbench SHALL be accessible through keyboard and assistive technology.

The canvas SHALL NOT be the only way to construct, inspect, navigate, or edit a model.

A structured semantic model tree/list SHALL provide an equivalent interaction surface.

A keyboard/screen-reader user SHALL be able to:

* create a model;
* state its purpose;
* add an element;
* create a relation;
* edit properties;
* navigate shared identities;
* inspect notes;
* execute a query;
* inspect evidence;
* inspect properties and requirements;
* review an agent hypothesis;
* accept or discard it;
* import and export.

Controls SHALL expose appropriate accessible names, roles, states, values, and relationships.

Graphical highlights SHALL have textual/semantic equivalents.

Dynamic query results, validation findings, and agent changes SHALL be perceivable without unnecessary focus movement.

Accessibility semantics also provide a useful secondary machine-readable surface, but do not replace the structured agent API.

⸻

20. Semantic affordance parity

Every public semantic capability SHALL have both human and machine affordances.

Capability	Human affordance	Machine affordance
Create model	Add Model	transaction
Create element	Add Element	transaction
Create relation	Connect	transaction
Edit property	Inspector	transaction
Inspect model	Canvas/tree/inspector	model/context API
Query	Query UI	SPARQL/query API
Analyze	Query/property UI	analysis API
Inspect evidence	Evidence panel	structured evidence
Add note	Notes inspector	annotation API
Inspect provenance	History/provenance UI	provenance API
Create hypothesis	Review UI	hypothesis API
Commit hypothesis	Accept	commit
Discard hypothesis	Discard	discard
Undo/redo	controls	undo/redo API
Import/export	controls	import/export API
Load example	Load Example	examples API

These affordances need not have identical forms.

They SHALL have identical semantic effects.

⸻

21. Normative UX invariants

UX-I1 — Semantic affordance parity

For every public semantic capability supported by MAGE, there SHALL exist at least one human-accessible affordance and at least one machine-accessible affordance. Both SHALL invoke the same underlying application semantics and operate on the same authoritative MAGE IR.

UX-I2 — Evidence parity

Every semantic result available to a machine client SHALL have a human-perceivable representation, and every human-visible semantic result SHALL be available in structured machine-readable form.

UX-I3 — Authoritative-state convergence

Every successful semantic edit, regardless of whether initiated through graphical interaction, inspector editing, structured source, import, or agent transaction, SHALL normalize to the same typed MAGE IR and cause all semantic projections to update from that IR.

UX-I4 — Purpose visibility

Every purposeful model SHALL expose its engineering purpose as a primary part of its human presentation, rather than treating purpose solely as hidden metadata.

UX-I5 — Property grounding

Every evaluated persistent property SHALL identify the model or models and evidence from which its current status is derived.

UX-I6 — Annotation noninterference

Notes, comments, rationale, and provenance SHALL NOT alter model semantics or analysis results unless the relevant information is explicitly represented by a semantic construct.

UX-I7 — Model plurality

Multiple purposeful models SHALL remain independently inspectable even when MAGE presents a linked or composed visualization of them. Linked presentation SHALL NOT implicitly create a unified semantic model.

⸻

22. Capability registry

Human and machine affordance parity SHOULD be enforced through one typed capability registry rather than manually maintained documentation.

For example:

capability: create-relation
service: relation-service.create
human:
  - canvas.connect
  - inspector.add-relation
  - keyboard.add-relation
machine:
  - transaction.add-relation

The registry SHOULD drive or validate:

* window.mage.describe();
* human capability tests;
* accessibility tests;
* agent API tests;
* documentation;
* system-model generation;
* CI invariants.

CI SHALL fail when a public semantic capability lacks either a human or machine affordance.

⸻

23. Interaction acceptance scenario

A complete end-to-end UX test SHALL demonstrate the following.

Start from an empty workbench.

A human loads Message Bus.

The workbench shows:

Event Flow
Which events may reach which consumers?
Data Policy
Which data may each service process?

The human selects:

✗ Restricted data cannot reach Analytics

MAGE opens Event Flow and Data Policy and displays the counterexample.

The human enters Linked mode and sees the shared identities and evidence across the two models.

The human edits the system to introduce a sanitized event.

The property is re-evaluated.

The human asks a new query and saves the resulting proposition as a property.

An external coding agent attaches to the same live workbench and proposes an additional modification as a hypothesis.

The human sees the hypothetical change and its evidence in the normal interface, accepts it, and sees the authoritative model update.

The human then changes a semantic property through structured source.

Canvas, inspector, property evaluations, RDF projection, query results, and agent context all observe the same semantic revision.

A keyboard-only user can perform the same consequential operations without using the graphical canvas.

If this scenario passes, the workbench is behaving as intended: not as a diagram editor with AI attached, but as an engineering environment in which purposeful models make consequential questions explicit and answerable.

=====

Ah, this implies one more thing --- One should be able to "promote" recent queries into Properties somehow? Having chatted with AI about things, one can then persist properties?

And then when a model is *changed*, if that breaks existing Properties, that's an "FYI things will definitely break" kind of question. Otherwise they get locked. A change might be strucutred as a transaction touching multiple models? Or including a "Change -- does htis break things" kind of question?

===

Yes. I think this exposes a missing central abstraction: Properties are not merely saved query results. They are the persistent claims the model system promises to preserve across change.

That makes the whole thing substantially more coherent.

Query → Property

A user chats with the agent, explores the models, and asks things like:

Can restricted data reach Analytics?

The query produces a proposition plus evidence:

QUERY
Can restricted data reach Analytics?
No.
Evidence:
  Event Flow + Data Policy
  No permitted path carries RESTRICTED data to Analytics.
[Promote to Property]

Promotion should capture the formal proposition, not the natural-language answer or current Boolean result:

PROPERTY
Restricted data cannot reach Analytics
Status       ESTABLISHED
Depends on   Event Flow, Data Policy
Evidence     [Inspect]
Created from query, Oct 2

The natural-language conversation is therefore useful for discovering what we care about. Promotion turns that discovery into engineering knowledge the workbench maintains.

That’s a very good story:

\text{exploration} \rightarrow \text{query} \rightarrow \text{property} \rightarrow \text{persistent obligation}

And it mirrors control hardening at a much smaller scale: something initially checked through reasoning becomes explicit structure.

Then Properties change the semantics of editing

Once Properties exist, I agree that ordinary edits cannot simply mutate the model underneath them.

I would make every semantic edit a transaction, whether it touches one model or five:

Current Model System
        │
        ▼
Proposed Transaction
   ├─ modify Event Flow
   ├─ modify Data Policy
   └─ add Performance annotation
        │
        ▼
Validate resulting model system
        │
        ▼
Re-evaluate affected Properties
        │
        ▼
Impact Report
        │
   ┌────┴─────┐
   │          │
 no break    break
   │          │
 commit     explicit decision

That gives us a wonderfully clean definition of a change:

A change is an atomic transaction over the model system whose consequences are evaluated before commitment.

It can absolutely touch multiple models. In fact, it must be able to, because many coherent changes naturally do. Rename/shared identity changes, adding a cache, changing an event schema plus policy, changing a lifecycle plus its quantitative annotations, etc.

I would distinguish Properties from Requirements here

I wouldn’t say all Properties are “locked” equally. There are at least two useful meanings:

Property: This is something we care about knowing. If a change flips it, MAGE tells us.

Requirement: This is something that must remain true. If a change violates it, MAGE blocks normal commit.

So:

PROPERTY
"Analytics cannot receive RESTRICTED data"
Before       ESTABLISHED
After        REFUTED
⚠ This change alters a tracked property.

versus:

REQUIREMENT
"Analytics must not receive RESTRICTED data"
Before       SATISFIED
After        VIOLATED
⛔ This transaction violates an active requirement.

That seems better than making every promoted query into an invariant automatically. Promotion says keep track of this. A further promotion says enforce this.

Perhaps:

Query
  ↓  Track
Property
  ↓  Require
Requirement

That’s quite elegant.

The change review becomes an important UI object

Suppose I add Analytics as a subscriber to OrderCreated. Before commit:

┌──────────────────────────────────────────────────────────────┐
│ Review Change                                                │
│                                                              │
│ 2 models modified                                            │
│                                                              │
│ Event Flow                                                   │
│   + Analytics subscribes to OrderCreated                     │
│                                                              │
│ Data Policy                                                  │
│   no change                                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ PROPERTY IMPACT                                              │
│                                                              │
│ ✗ Restricted data cannot reach Analytics                    │
│   ESTABLISHED → REFUTED                                      │
│   [Show counterexample]                                      │
│                                                              │
│ ✓ Billing can receive OrderCreated                          │
│   ESTABLISHED → ESTABLISHED                                  │
│                                                              │
│ ○ 4 unaffected properties                                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                            [Discard] [Revise] [Commit Change] │
└──────────────────────────────────────────────────────────────┘

For a Requirement violation, Commit Change is unavailable under the normal workflow. You would need to explicitly change/remove the requirement as part of the transaction, or perhaps use an intentionally exceptional override mechanism if we ever want one.

That means a transaction can even say:

Transaction: Permit analytics access
Event Flow
  + Analytics subscribes to OrderCreated
Data Policy
  + Analytics permitted RESTRICTED
Requirement
  ~ Analytics must not receive RESTRICTED
    → Analytics may receive RESTRICTED
Rationale
  Analytics has been approved for restricted processing.

Now the requirement change itself is visible as part of the engineering change, rather than silently making the red light green.

That’s excellent.

“What will this break?” becomes a native operation

I think this deserves first-class status rather than merely happening during commit.

Select a proposed transaction:

Proposed Change
  Add cache
  Split OrderCreated
  Change retry limit
[Analyze Impact]

or tell the agent:

Change this to use two topics. What does that break?

MAGE evaluates the hypothetical model system without committing it.

The result should distinguish:

IMPACT
Properties
  ✓ 7 remain established
  ✗ 1 becomes refuted
  ? 1 becomes not-answerable
  ◐ 1 becomes conditional
Requirements
  ✓ 3 remain satisfied
  ⛔ 1 becomes violated
Models
  Event Flow       modified
  Data Policy      modified
  Performance      unaffected

The becomes not-answerable case is especially important. A change can break not only a truth but our ability to establish the truth. For example, removing payload distinctions might change:

ESTABLISHED → NOT ANSWERABLE

That is absolutely an engineering regression.

We should probably stop thinking of “hypothesis” and “transaction” as separate machinery

I think the cleaner architecture is:

* Transaction = a set of proposed semantic operations.
* Hypothesis = evaluating a transaction without committing it.
* Commit = make that transaction authoritative after validation/impact analysis.

So:

T = {
    add event SanitizedOrder,
    add publishes relation,
    change Analytics subscription
}
Current IR + T
       ↓
Hypothetical IR
       ↓
validate
       ↓
evaluate properties
       ↓
impact report
       ↓
commit T / revise T / discard T

Human canvas edits can build a transaction. Source edits can build one. An agent can build one. A multi-model change can build one. Same mechanism.

This simplifies a lot of the earlier UX architecture.

And properties need dependency tracking

We don’t necessarily want to reevaluate 500 properties after moving one unrelated thing.

A property evaluation should record something like:

Property: data-safety
depends_on:
  models:
    - event-flow
    - data-policy
  distinctions:
    - publishes
    - subscribes
    - event-payload
    - data-classification
    - processing-permission

Then a transaction touching only performance.gateway_latency clearly cannot affect it.

We can conservatively reevaluate whenever uncertain. Correctness matters more than clever incremental evaluation.

This gives MAGE a much stronger conceptual model

I would actually revise the UX’s central chain from:

\text{Purpose} \rightarrow \text{Model} \rightarrow \text{Property} \rightarrow \text{Evidence}

to include change:

\boxed{
\text{Purpose}
\rightarrow
\text{Model}
\rightarrow
\text{Property}
\rightarrow
\text{Change}
\rightarrow
\text{Impact}
}

with evidence underneath all of it.

Or operationally:

ASK
 ↓
Query
 ↓
"That matters"
 ↓
Property
 ↓
"That must hold"
 ↓
Requirement
                    CHANGE
                       ↓
              Proposed Transaction
                       ↓
                 Impact Analysis
                 /      |       \
           preserved  changed  unknowable
                       ↓
              evidence + judgment
                       ↓
                    Commit

This feels like an important improvement. Modeling is no longer just a way to answer questions about the system as it exists. It makes the consequences of changing the system inspectable before the change becomes authoritative.

And that is exactly the kind of thing that makes the workbench useful beyond the Modeling lecture.
