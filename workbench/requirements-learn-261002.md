One more. We need a *Learn* button at the top that takes us to a page that lists model types and lets you see a visual of each one, explain what it's for, what Properties you can measure over it, and another model you might combine it with for a richer Property

==

Yes. And I think Learn solves an important problem created by the progressive-disclosure redesign: we can keep the workbench clean because conceptual documentation has a proper home.

I would add this directly to the UX brief:

Learn

The global header SHALL contain a persistent Learn entry:

MAGE     Workspace     Learn                              ⋯

Learn opens a model gallery. It is documentation and exploration, not another editing surface.

The landing page should be strongly visual:

Learn MAGE Models
Choose a model by the engineering question you need to answer.
┌────────────────────────┐  ┌────────────────────────┐
│   [small visual]       │  │   [small visual]       │
│                        │  │                        │
│ Structural Graph       │  │ State Machine          │
│                        │  │                        │
│ What is connected      │  │ What behavior can      │
│ to what?               │  │ occur over time?       │
│                        │  │                        │
│ [Learn]                │  │ [Learn]                │
└────────────────────────┘  └────────────────────────┘
┌────────────────────────┐  ┌────────────────────────┐
│   [small visual]       │  │   [small visual]       │
│ Quantitative Model     │  │ Data / Policy Model    │
│                        │  │                        │
│ What does an execution │  │ What information and   │
│ cost?                  │  │ permissions exist?     │
│                        │  │                        │
│ [Learn]                │  │ [Learn]                │
└────────────────────────┘  └────────────────────────┘

The important framing is question first. Don’t lead with a taxonomy of MAGE’s internal types.

Clicking a card opens a compact model-type page with four things.

1. What is this model for?

For a state machine:

State Machine
What behaviors can occur over time?

A state machine preserves control state and the transitions that may change it. Use one when the engineering question depends on ordering, reachability, recurrence, or what must happen before something else can happen.

Then show an actual little interactive visual:

          claim
 queued ────────► processing
                     │
             ┌───────┴────────┐
             ▼                ▼
         completed          failed
                              │
                              │ retry
                              ▼
                            queued

Ideally this is rendered using the same renderer as the workbench, not a documentation illustration. Hover/select should work. This means Learn is also dogfooding the actual representation.

2. What Properties can it establish?

Not every query operator. Give recognizable engineering questions:

Properties you can measure
✓ completed is reachable
✓ publication cannot occur before review
✓ a failed job can return to queued
✓ retry cannot continue indefinitely
? every accepted job eventually completes
  Requires assumptions this model may not represent

This is particularly valuable pedagogically: students learn a model by learning what claims it licenses.

3. What does it deliberately not tell you?

This should be prominent:

This model does not necessarily tell you
• how long an execution takes
• how much memory it consumes
• where a component is deployed
• what data a transition carries

Again, purposeful reduction rather than model taxonomy.

4. Combine it with another model

This is the really good addition:

Combine with
┌──────────────────────────────────────────────────────┐
│ Quantitative Model                                  │
│                                                     │
│ State Machine tells you:                            │
│   which executions are possible                     │
│                                                     │
│ Quantitative Model tells you:                       │
│   what those states or operations cost              │
│                                                     │
│ Together you can ask:                               │
│                                                     │
│   "Can a document reach Published within 750 ms?"   │
│                                                     │
│              [See combined example]                 │
└──────────────────────────────────────────────────────┘

That’s much better than merely saying “state machines can be combined with quantitative models.” It teaches why composition creates a stronger Property.

For structural models, for example:

STRUCTURAL MODEL
What is connected to what?
Can establish
  Checkout may publish OrderCreated
  Analytics may receive OrderCreated
  Gateway is reachable from Remediation
Combine with → Data Policy
Structural model:
  who may receive OrderCreated
Data Policy:
  what OrderCreated carries
  what Analytics may process
Together:
  "Can RESTRICTED data reach a service
   permitted to process only INTERNAL data?"

And this gives us a lovely way to teach the entire MAGE modeling idea without writing a conventional manual.

I would also connect Learn back into the workbench contextually. + Model could show:

Add model
Structural Graph
What is connected to what?
State Machine
What behavior can occur?
Quantitative Model
What does behavior cost?
Not sure?
[Learn about model types]

And when looking at a state machine:

⋯
About State Machines
Possible combinations

takes you directly to that Learn page.

Similarly, NOT ANSWERABLE can sometimes point there:

NOT ANSWERABLE
Your current models do not represent execution duration.
To answer this question, you may need a Quantitative Model.
[Learn about Quantitative Models]

That is much better than the workbench itself explaining quantitative-model semantics inline.

One caution: the Learn gallery must be generated from the actual model-type/capability registry, just as we discussed for affordances. Otherwise it will become a hand-maintained brochure that drifts away from what MAGE actually supports.

I’d therefore add another UX invariant:

UX-I9 — Learn from the system: Every public model type SHALL have a Learn entry derived from the same model-type definition used by the workbench. Its examples, supported Property families, and suggested compositions SHALL describe capabilities actually supported by the model kernel.

And I would make the conceptual structure of every Learn page deliberately repetitive:

Question → Visual → What it preserves → Properties it supports → What it omits → Combine with → Richer Property.

That is effectively the Modeling unit distilled into an interactive reference, while allowing the actual workbench to become much quieter.
