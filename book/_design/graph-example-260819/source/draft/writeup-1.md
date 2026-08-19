Yes. I think this deserves a real worked thread across Parts 2, 3, and 5, not merely an updated example. The computation graph has become unusually good book material because the system itself enacted the distinction the book is trying to teach.

The current Part 2 already gives us the right theoretical slots: purposeful reduction; graphs as structured representations; heterogeneous models; derive when implementation is authoritative; and correspondence as something that should be mechanically checked.   The new material should supersede the thinner structural/computation-graph treatment, rather than creating a new model class.

Editorial Outline: The Computation Graph as a Worked MAGE Example

Editorial objective

Use DocAble’s remediation computation graph as a recurring worked example that demonstrates three distinct claims:

1. Part 2 — Modeling: a useful model is selected for an engineering question, and its semantics may have to be discovered rather than merely transcribed.
2. Part 3 — Alignment: correspondence between model and territory can be made mechanically strong without giving the model runtime authority.
3. Part 5 — Evidence: this distinction was learned through the actual construction of DocAble. The system began with a useful computational decomposition but left too much of the behavior between those computations implicit. That omission accumulated as engineering complexity until the missing model became visible.

The important story is therefore not “we added edges to a graph.”

It is:

We had already modeled the computations. We had not adequately modeled their composition.

That asymmetry explains both why the eventual model could be projected from the implementation and why the implementation had accumulated unnecessary variation before we did so.

⸻

Part 2 — Modeling

Placement

Primary insertion should be in the Structural Models chapter, with a shorter callback in §2.8 System Knowledge: Connecting the Models.

Do not create a seventh model class. The computation graph is a structural model whose nodes happen to represent computations and whose typed edges represent relations among them.

The existing Part 2 already establishes that graphs are defined by the engineering semantics of their entities and relations rather than by storage or notation. Preserve that framing.

A. Supersede the existing computation-graph example

Replace any treatment that presents the DocAble graph primarily as a collection of named computations with the now-complete example.

Engineering question

What computations constitute remediation, and how do their outputs constrain or enable other computations?

This is deliberately stronger than:

What passes exist?

The earlier node-only representation could answer the latter. It could not adequately answer the former.

Model

A static computation graph:

* nodes identify remediation computations;
* node metadata classifies their effects;
* typed data-flow edges identify produced facets consumed in another computation’s output;
* typed control-gate edges separately identify facets consulted only to determine whether a computation executes;
* cross-service edges preserve composition across a service boundary.

The graph is a purposeful reduction of the executable pipeline. It does not represent invocation history, duration, retries, cost, model fingerprints, or other runtime facts. Those would belong to an execution model.

Property

The model now makes questions mechanically tractable that previously required reading implementation:

* If computation X changes its output, which computations consume it?
* Which dependencies carry data and which merely gate execution?
* Can pipeline order contradict a declared data dependency?
* Which computations have bounded typed effects?
* Which remain direct editors with comparatively unconstrained effects?

Quality attributes

Primary:

* analyzability;
* evolvability;
* architectural integrity.

Secondary:

* change-impact reasoning;
* testability;
* maintainability.

⸻

B. Make the node/edge asymmetry pedagogically explicit

This is the conceptual center of the Part 2 example.

Stage 1 — The computations were already modeled

DocAble already possessed a useful computational decomposition.

The remediation pipeline consisted of registered passes. Those passes gave the eventual model a stable node vocabulary. This matters: the graph was not invented afterward from arbitrary clusters of source code.

The system had already answered:

What are the consequential units of computation?

That prior modeling decision is what later made node projection possible.

Stage 2 — Their composition was not

The initial graph had 113 nodes but only two hand-authored edges.

Treat that mismatch as diagnostic rather than merely incomplete documentation.

A system containing 113 modeled computations but only two represented relationships among them was telling us something:

we had modeled the parts more successfully than the relationships among the parts.

The implementation knew considerably more than the model did. Data passed between computations; signals gated computations; passes mutated shared state. But those semantics remained encoded heterogeneously in implementation rather than exposed as one explicit composition model.

Stage 3 — Ask what an edge actually means

Do not jump directly from 2 to 33.

The useful modeling work occurred when we asked:

What relationship between two computations is important enough to preserve?

The first naive answer — “one pass reads something another pass produced” — proved too coarse.

A full IO sweep initially yielded 33 apparently homogeneous dependencies. Inspection showed that roughly 22 represented values read only in routing predicates such as ShouldRun or IsRouted.

That forced a semantic distinction:

data dependency ≠ control dependency.

Introduce the resulting vocabulary:

* Produces
* Consumes
* ConsumesForControl

and the corresponding relations:

* DATA_FLOW
* CONTROL_GATE
* CROSS_SERVICE

The lesson is important enough to state directly:

A graph becomes an engineering model when its edges mean something.

The modeling work was not drawing more arrows. It was discovering which kinds of arrows existed.

Stage 4 — The model exposed a second missing dimension: effect boundedness

Once computations were being treated explicitly as model entities, another question became cheap to ask:

What does each computation do to the artifact?

The answer was not uniform.

The resulting mutation classification should appear here:

* 15 TypedPatchProducer
* 40 DirectEditor
* 13 ReadOnly

Explain the significance carefully.

Do not imply that DirectEditor is a defect merely because it is less constrained. It is a truthful representation of remaining freedom.

The important achievement is epistemic:

Before classification, effect boundedness was implicit. After classification, the model tells us where effects are typed and where they are not.

This is a particularly good application of the book’s degrees-of-freedom argument. Some freedom may be justified; some may merely be historical residue. The model lets us distinguish the question instead of assuming an answer.

⸻

C. Add a small “model construction is discovery” lesson

This example should slightly deepen Part 2’s treatment of purposeful reduction.

Proposed conceptual point:

Model construction can discover distinctions in the territory.

We did not begin with a finished ontology and mechanically encode it. Trying to represent composition exposed that “consumes” was overloaded. The attempt to build the graph revealed two relations with different semantics: consumption for output and consumption for control.

This is worth connecting to the Part’s existing claim that the engineering question determines the model.

The question evolved:

1. What computations exist?
2. How do they depend on one another?
3. What kind of dependency is this?
4. What kind of effect does this computation have?

Each question required more semantics.

That is exactly the Part 2 method operating on a live system.

⸻

D. Figure: evolution of the computation model

Add a figure rather than trying to explain the entire transition in prose.

Suggested structure:

THE TERRITORY
registered remediation passes + shared values + routing logic
                         │
                         │ identify computations
                         ▼
EARLY MODEL
113 nodes · 2 authored edges
"what computations exist?"
                         │
                         │ model composition
                         ▼
NAIVE COMPOSITION
113 nodes · 33 candidate dependencies
                         │
                         │ distinguish semantics
                         ▼
TYPED COMPUTATION GRAPH
113 nodes
 ├── 10 DATA_FLOW
 ├── 22 CONTROL_GATE
 └──  1 CROSS_SERVICE
node effect:
15 TypedPatchProducer
40 DirectEditor
13 ReadOnly

Caption should emphasize:

The graph became richer because the engineering questions became richer. The original decomposition already identified computations; modeling their composition exposed distinct data and control relations and made effect boundedness explicit.

Do not visually suggest that the final graph is “complete.”

⸻

E. Strengthen §2.8.2, “Maintain Explicit Correspondence”

The current rule is already exactly right:

* implementation authoritative → derive;
* model authoritative → generate;
* neither fully authoritative → trace and check.

The computation graph should become the canonical concrete example of the derive case.

New worked example

The C# pass declarations remain territory.

Each pass declares typed IO facets.

The Python graph projects its edges from those declarations:

E = project(typed composition)

The edge model is therefore not a second independently maintained description of the same fact.

This sharply illustrates the existing Part 2 principle:

Reduce the number of independent truths that must be reconciled.

A blocking parity lint then checks that the projection machinery and declarations agree.

Important wording:

The model is derived, but it is still a model.

Derivation changes the correspondence problem; it does not eliminate purposeful reduction.

The computation graph omits most properties of the implementation while preserving exactly the relationships needed for structural reasoning.

⸻

F. Preserve the execution-graph boundary

Explicitly state what the computation graph does not model.

It is static.

It does not answer:

* Did this pass execute in run R?
* How long did it take?
* What did it cost?
* Which model/version did it invoke?
* Did it retry?
* What divergence was observed?

Those are different engineering questions and therefore call for a different model: a future execution graph.

This is a strong demonstration of purposeful reduction. Resist the temptation to “complete” the computation graph by stuffing runtime facts into it.

⸻

Part 3 — Alignment

Placement

Primary insertion belongs in §3.2, From Intent to Obligation, around the existing correspondence/conformance/acceptance distinction.

Secondary callback belongs in the validator/gate discussion.

The new example is especially valuable because it prevents a common conceptual error:

mechanically enforced correspondence does not imply model authority over execution.

⸻

A. Use the computation graph as the strongest correspondence example

Part 3 currently says that drift checking preserves a declared correspondence and that agreement is not correctness.

The computation graph now makes this concrete.

Territory

C# pass registry and typed declarations.

Model

Projected static computation graph.

Correspondence obligation

For the modeled surface, the graph must agree with the declarations from which its entities and relations are projected.

Mechanism

lint-remediation-graph-parity

Consequence

BLOCKING

The key point:

This is strong Alignment of the model to the territory, not authority of the model over the territory.

The lint makes disagreement unacceptable.

It does not make the Python graph execute the pipeline.

⸻

B. Introduce the two independent axes explicitly

This example gives Part 3 an unusually clean opportunity to distinguish:

Axis 1 — Fidelity / correspondence strength

How strongly is the model kept aligned with territory?

The computation graph moved from:

two manually authored edges

to:

projected edges + blocking drift detection.

Its fidelity became dramatically stronger.

Axis 2 — Authority direction

Which representation determines behavior?

This did not change.

Before:

runtime/declarations → model

After:

runtime/declarations → model

The model became more faithful without becoming more authoritative.

This deserves either a small figure or a boxed example.

CORRESPONDENCE STRENGTH
weak -------------------------------------> strong
manual edges                    projection + blocking parity
AUTHORITY DIRECTION
territory ---------------------------------------> model
                    unchanged

The book already says correspondence and gating are separate choices. This is the best native DocAble example of that proposition.

⸻

C. Explicitly contrast projection with code generation

Use a short counterfactual.

As built

C# declarations
      │
      │ project
      ▼
computation graph
      │
      │ parity check
      └────────────── checks correspondence

Not built

computation graph
      │
      │ generate
      ▼
executable pipeline

The second architecture would move authority model → implementation.

DocAble deliberately does not do that.

This lets Part 3 make a subtle but important claim:

A model can participate in a blocking Alignment mechanism without being the source of truth for execution.

That is worth retaining as canonical language.

⸻

D. Use O365 as the negative control

Do not hide the remaining asymmetry.

PDF edge correspondence is mechanically strong.

O365 node parity is enforced, but edge projection remains audit-only/not built.

That gives the reader an excellent comparison within the same system:

* same modeling ambition;
* different correspondence strength;
* explicitly known residual.

This is much better evidence than pretending the substrate is uniformly finished.

It also demonstrates what Part 3 means by treating the control estate itself as an engineering object: the strength of Alignment is itself represented and inspectable.

⸻

Part 5 — The Evidence

Placement

Yes: add a personal field note.

The natural location is probably in the later originating-case material where the system models and governance apparatus have emerged, rather than §5.1. It should occur after the reader has seen enough chronology to understand that this was retrospective discovery rather than initial architecture.

It should be first-person and unusually candid.

The current Part 5 explicitly promises to preserve wrong turns because the finished architecture cannot show what it replaced. This episode is almost tailor-made for that purpose.

Suggested field-note title

Field note — I modeled the computations before I modeled their composition

Alternative:

Field note — The missing edges

I prefer the first because the intellectual mistake is more interesting than the graph symptom.

⸻

A. Personal chronology

The note should establish:

1. What I got right early

I thought about DocAble as a computation pipeline.

The system therefore acquired identifiable remediation passes — meaningful units of computation — relatively early.

That decision survived.

It eventually gave the computation graph its nodes and made mechanical projection possible.

This is important because the story should not become a false confession that “we had no model.”

We had a partial model.

2. What I failed to model

I did not give comparable attention to the composition of those computations:

* what each consumed;
* what each produced;
* what merely gated execution;
* what kind of mutation each performed;
* which effects were bounded and typed;
* which were unconstrained direct edits.

Those relationships remained largely tacit in code.

3. What abundant implementation did with that freedom

Agents filled the unspecified region.

Because the local contract around a pass was permissive, individually plausible implementations accumulated with substantial variation.

The result was not necessarily locally incorrect code.

The problem was that the system had too many realization choices in one of its hardest regions.

This is where the degrees-of-freedom language belongs.

The hard part of DocAble was not naming the remediation computations. It was controlling how those computations composed over a mutable document representation.

And that was exactly where the engineering environment left substantial freedom.

4. The algorithmic symptom

Include the O(N²)-for-O(N)-passes episode, but be precise about what it proves.

Do not say:

lack of modeling caused quadratic algorithms.

That overclaims.

Say something closer to:

With composition and mutation semantics left implicit, independently implemented passes repeatedly rediscovered or traversed document state. At pipeline scale, work that looked reasonable inside one pass accumulated into O(N²)-like behavior across O(N) passes.

The point is architectural:

local freedom composed into global cost.

This is a strong concrete example of why degrees of freedom have an economic/engineering consequence.

5. What finally exposed the problem

When we tried to represent the computation graph faithfully, the model fought back.

113 nodes and two edges was obviously implausible.

Trying to derive the missing edges forced us to inspect what “dependency” actually meant.

Then the supposedly simple relation split:

* data consumption;
* control gating.

Trying to characterize nodes similarly exposed:

* typed patch producers;
* direct editors;
* read-only passes.

The model did not merely document the architecture.

Building the model exposed the architecture we actually had.

6. The remediation

The eventual response was not “draw the missing arrows.”

It was to move semantics into typed declarations and project the graph from them.

That is the key engineering move:

implicit composition
        ↓
typed IO declarations
        ↓
projected computation relations
        ↓
blocking correspondence check

The resulting graph is both cheaper to maintain and more trustworthy because the relationships are no longer independently authored.

7. The residual is part of the lesson

Forty direct editors remain.

O365 edge projection remains incomplete.

There is no execution graph.

Keep all three facts.

They make the lesson stronger:

Modeling did not magically remove the system’s degrees of freedom. It made them visible enough to decide which ones were worth removing.

That sentence is probably the conceptual payoff of the field note.

⸻

Cross-Part progression

The three appearances should deliberately answer different questions.

Part 2

What did we learn by modeling it?

We learned that computation composition had semantics worth representing: data flow, control gating, and effect boundedness.

Part 3

How do we know the model stays aligned?

The relationships are projected from typed declarations and checked with blocking parity — strong correspondence without making the model executable.

Part 5

Why did we need this model in the first place?

Because the system’s hardest region had accumulated too much unconstrained implementation freedom. The eventual model revealed both why the earlier design had been projectable and what that earlier design had failed to capture.

⸻

The larger MAGE lesson

This example should ultimately support a stronger statement than the present manuscript makes:

Degrees of freedom are not distributed uniformly across a system.

Leaving freedom in commodity realization can be economical.

Leaving freedom in a semantically consequential composition boundary can be extraordinarily expensive.

The engineering question is therefore not merely:

How many degrees of freedom remain?

It is:

Where are the remaining degrees of freedom, and what happens when independently reasonable choices compose there?

DocAble supplies an unusually concrete answer.

The remediation computations themselves were sufficiently modeled to become stable nodes. Their composition was under-modeled, so variation accumulated in the relations and effects between them. Once that region became explicit, some freedom could be retired into typed composition while the remaining freedom could at least be named honestly.

That connects the computation-graph episode directly to the book’s central rule:

Model what must be true; leave the rest free.

With one refinement supplied by the evidence:

When the “rest” repeatedly produces consequential variation, you may have mistaken an obligation for a degree of freedom.

One thing I would not do is make the personal note a triumphal “then MAGE fixed it” story. Part 5 currently says, correctly, that “the clean method arrived last” and that missing representation became expensive in some places. mage-book-Part5(20260819-112049).pdf This episode is much more valuable as a precise account of partial modeling: you had found a durable decomposition, but had not yet modeled the composition semantics. That is why both halves of the history are true.

And the new as-built facts make the ending unusually satisfying without needing embellishment: 113 nodes, 33 projected edges; the naive edge sweep itself discovered the data/control distinction; 15/40/13 makes boundedness visible; and the model remains deliberately descriptive rather than executable.  

The last line of the outline may be the most important addition to the book. Your current Part 2 already says unmodeled choices may be unknown, tacit, or genuinely free. The computation-graph episode supplies the missing empirical diagnostic: recurring consequential variation is evidence that something you treated as free may actually contain an undiscovered obligation. That is a substantial sharpening of the DoF theory.
