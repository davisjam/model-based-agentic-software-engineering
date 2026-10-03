Yes. This is semantically rich but UX-hostile. It has implemented nearly every capability we asked for and then presented nearly every capability simultaneously. It reads like an executable specification/debug console, not a workbench.

The biggest problem is hierarchy. On loading Message Bus, I should see Message Bus, its three purposeful models, the important tracked properties, and a model canvas. I should not immediately see all 11 entities, all 18 relations with their formal absence semantics, every note, provenance, every mutation primitive, the property-management machinery, all six evaluations, validation, and then another diagram at the bottom.

The current page has confused “everything must be human-accessible” with “everything must be simultaneously visible.” Those are almost opposites in a good workbench.

I would give the agent this redesign instruction

Do not remove semantic capability. Replace the document-style vertically concatenated UI with a navigable application shell using progressive disclosure.

The normal loaded state should look approximately like:

┌──────────────────────────────────────────────────────────────────────┐
│ MAGE   Message Bus                              Undo  Redo  ⋯       │
├───────────────────┬──────────────────────────────────┬───────────────┤
│ MODELS            │ Event Flow                       │ INSPECTOR     │
│                   │ Which services may publish or    │               │
│ Event Flow        │ receive each event type?         │ Checkout      │
│ Data Policy       │                                  │ service       │
│ Event Propagation │                                  │               │
│ + Model           │          [ MODEL CANVAS ]        │ Appears in    │
│                   │                                  │ Event Flow    │
│ PROPERTIES        │                                  │ Data Policy   │
│                   │                                  │ Propagation   │
│ ✓ Checkout → ...  │                                  │               │
│ ✗ Data safety     │                                  │ [Notes]       │
│ ? Runtime delivery│                                  │ [Provenance]  │
│ + Property        │                                  │               │
├───────────────────┴──────────────────────────────────┴───────────────┤
│ Ask about the model system…                              [Ask]      │
└──────────────────────────────────────────────────────────────────────┘

That should be most of the product.

1. Get rid of the giant Start section after something is loaded

Start is an empty-workspace experience.

Before loading:

MAGE Model Workbench
[ Create model system ]   [ Open .mage.yaml ]
Examples
┌ Message Bus ───────────────────────┐
│ Event-driven architecture          │
│ 3 purposeful models                │
│ [Open]                             │
└────────────────────────────────────┘
...

After loading Message Bus, Start disappears. There is no reason to keep explaining the three ways into the application.

And this prose absolutely should not be in the product:

“Their titles, models and suggested questions below are read from the example files themselves rather than written here — which is why this paragraph no longer says how many there are. It said ‘two’ beside a list of three for part of a day…”

That’s a developer retrospective accidentally exposed as product UX. Delete it.

2. Models are navigation, not tables

This:

Models: 3 row(s)
Id / Label / Kind / Detail

is a debug representation.

The normal human representation should be:

MODELS
Event Flow
Which services may publish each event type,
which may receive it, and which may call directly?
Data Policy
What data does each event type carry, and
what sensitivity may each service process?
Event Propagation
Can an event originating at one service
eventually cause an event to reach another?

Click one, and then show it.

Its represents and omits are useful, but tuck them immediately below the purpose in collapsible model information:

Event Flow
Which services may publish each event type,
which may receive it, and which may call directly?
[Model canvas]
▸ What this model represents
▸ What this model omits
▸ Notes
▸ History

Purpose stays visible. Supporting epistemic machinery is one click away.

3. Entities and relations should not be global tables

The enormous Entities and Relations tables are the clearest symptom.

They are useful inspection surfaces, not the home page.

Click Analytics in the canvas:

INSPECTOR
Analytics
service
Properties
  permits       internal
Appears in
  Event Flow
  Data Policy
  Event Propagation
Relations
  subscribes → OrderCreated
▸ Notes
▸ Provenance

Click a relation:

INSPECTOR
Analytics subscribes to OrderCreated
Type
  subscribes
Meaning
  The design permits Analytics to receive
  OrderCreated.
Absence means
  No subscription is represented.
Composition
  Multi-hop traversal not licensed
▸ Notes
▸ Provenance

Now all the rich semantics still exist, but the user asks for them by selecting the thing they concern.

There can be an advanced System Browser for people who really want the 11-entity/18-relation tabular view.

4. “Edit” cannot be a 50-control form

This whole section:

Add an entity
Add a state
Delete an element
Connect two entities
Remove a relation
Change a label
Set or clear a property
Add a model
Remove a model
Attach a note

is basically window.mage rendered as HTML.

That’s exactly what we didn’t want.

Editing should be contextual.

Canvas blank space / toolbar:

+ Add → Entity / State / …

Selected entity:

Rename / Set property / Connect / Delete

Selected model:

Add element / Edit purpose / Delete model

Selected relation:

Edit / Delete

And perhaps one command palette:

⌘K Add entity
⌘K Connect Analytics to…
⌘K Add model

The machine API can remain orthogonal and exhaustive. The human UX should expose the operation where the user naturally encounters its object.

5. Questions need to become a lightweight persistent bottom surface

The current query builder is also implementation leaking through:

Shape of question: direct
Relation to traverse: calls
From: any entity
To: any entity
Quantifier: exists
Hop limit…

Useful as Advanced Query. Terrible as the primary interaction.

The primary surface should simply be:

Ask about the model system…
[ Can restricted data reach Analytics?                         ] [Ask]

with suggested questions available on focus.

Since we’re deliberately relying on the coding agent for natural-language interaction, MAGE itself can also expose contextual deterministic questions:

Analytics selected
Ask
  Can anything reach Analytics?
  What can Analytics receive?
  Which properties involve Analytics?

The formal query builder can live under Advanced.

6. Properties deserve the persistent rail

This is where I would actually expose more, not less.

Something like:

PROPERTIES
✓ Checkout can eventually reach Fulfillment
✗ Restricted data may reach Analytics
? Analytics received OrderCreated at 2:04 PM
+ Property

Click one and the workspace changes to explain that property.

For example:

Restricted data may reach Analytics
ESTABLISHED
Uses
  Event Flow
  Data Policy
┌──────────────────────┬──────────────────────┐
│ EVENT FLOW           │ DATA POLICY          │
│                      │                      │
│ OrderCreated ───────►│ shipping-address     │
│       │              │ RESTRICTED           │
│       ▼              │                      │
│ Analytics            │ Analytics            │
│                      │ permits INTERNAL     │
└──────────────────────┴──────────────────────┘
Evidence
  OrderCreated carries RESTRICTED data
  Analytics subscribes to OrderCreated
  Analytics permits only INTERNAL

That is the A/C combination we discussed. The user moves naturally between models and claims about those models.

7. Query promotion should be almost trivial

After asking:

Can restricted data reach Analytics?
YES
Witness found.
OrderCreated → Analytics
[Inspect evidence]       [Track as property]

Click Track as property:

Track this claim
Claim
  Restricted data can reach Analytics
[Track]

Don’t expose immutable IDs, quantifier semantics, expectation internals, etc. unless Advanced is opened.

And then, perhaps from the property:

⋯ → Make requirement

That gives us the clean lifecycle we just identified:

ask
 ↓
query
 ↓
Track as property
 ↓
persistent property
 ↓
Make requirement
 ↓
enforced obligation

8. Changes should have their own review surface, not “authoritative vs hypothesis” radio buttons everywhere

This:

Apply the next edit to
○ the authoritative model
○ a hypothesis, left for review…

is exposing internal architecture.

The normal user edits normally. MAGE constructs a transaction.

For a consequential multi-model/agent change, show:

REVIEW CHANGE
3 changes across 2 models
Event Flow
  + Analytics subscribes to OrderCreated
Data Policy
  ~ Analytics permits PUBLIC → INTERNAL
PROPERTY IMPACT
✓ 5 unchanged
✗ Data safety
  ESTABLISHED → REFUTED
  [Inspect]
? Runtime-delivery property
  unchanged: NOT ANSWERABLE
REQUIREMENTS
✓ 2 remain satisfied
[Discard]                         [Commit]

If there is no tracked-property consequence, don’t make the user stare at this every time they rename a label. Transactions are an architectural guarantee; they don’t all need to become modal ceremonies.

For an agent-created hypothesis, the review surface is appropriate because review is the point.

9. Validation should be quiet when successful

Validation — No validation findings. should probably be a small status indicator:

✓ Valid

in the footer/status bar.

Click it to open validation details.

When there is a problem, then it deserves attention.

Same principle for provenance. A page-long provenance section for three models is backwards. Provenance belongs under the selected object’s History/Provenance inspector.

10. The diagram should be the workspace, not the epilogue

This may be the largest visual mistake.

Currently the page dumps the complete textual database and then eventually reaches “Diagram.”

Invert that.

The diagram/model visualization is the center of the application. The structured text exists as its accessible and inspectable counterpart.

And the accessibility requirement does not mean we must visually render the entire screen-reader representation. A semantic model tree can provide equivalent keyboard/AT access while sighted users get progressive disclosure.

The design rule I’d add to the UX spec

We need one more invariant because the implementation has revealed the failure mode:

UX-I8 — Progressive disclosure: Every semantic capability SHALL be human-accessible, but the workbench SHALL expose information and operations in the context of the model, property, evidence, or element to which they apply. Exhaustive representations of model contents, semantic metadata, operations, provenance, or analysis machinery SHALL NOT constitute the default workspace.

And perhaps the sharper implementation guidance:

Human-accessible does not mean simultaneously visible. Machine completeness is provided by the API; human completeness is provided by navigation.

That is the conceptual correction.

The implementation underneath this actually looks encouraging. The agent has built an impressive amount of the semantic machinery we specified. I would tell it not to redesign the model kernel at all. This is now an information-architecture and interaction-design pass: put the machinery away, make Models and Properties the two principal navigation objects, make the selected model/property occupy the center, and reveal everything else through selection, inspection, and progressive disclosure.
