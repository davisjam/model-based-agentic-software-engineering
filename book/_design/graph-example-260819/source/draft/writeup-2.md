Yes. I would preserve the existing document-mutation seam in §2.2 rather than replace it: it is doing a different job. The computation graph becomes the second, richer structural example, then returns in §2.8 as the canonical derive/projection example, in §3.2 as the clean correspondence-without-authority example, and in Part 5 as the longitudinal account of how that structure was discovered. That fits the manuscript’s current architecture: §2.2 already separates model from enforcement, §2.8 already says “derive where implementation is source of truth,” and §3.2 already distinguishes correspondence from correctness.  

Full Editorial Treatment: The Computation Graph Across Parts 2, 3, and 5

Editorial summary

The newly completed computation-graph work should become a recurring worked example across Modeling, Alignment, and Evidence.

The important story is not that DocAble acquired a graph with more edges. It is that the system had already modeled units of computation reasonably well while leaving much of their composition implicit. That asymmetry had consequences.

The existing remediation passes gave the system stable computational units. They are why the node side of the graph could later be projected mechanically. But the relations among those passes — what each produced, what another actually consumed, what merely controlled whether it ran, and what kind of effect each pass had on the document — remained comparatively unconstrained. Independent implementations filled that open region in different ways. Local choices that were individually plausible accumulated global complexity, including repeated traversals and O(N²)-like behavior across an O(N)-pass pipeline.

The completed modeling work made that region explicit. The initial symptom was stark: 113 nodes and only two hand-authored edges. Modeling the missing composition did not simply produce more arrows. It forced a semantic distinction between data dependencies and control dependencies, and then a second distinction among typed patch producers, direct editors, and read-only passes. Those distinctions were subsequently moved into typed declarations from which the graph is projected and against which correspondence is blocking-enforced.

The example therefore carries three different lessons:

* Part 2: modeling can reveal distinctions in the system rather than merely record distinctions already known.
* Part 3: model–territory correspondence can become mechanically strong without making the model authoritative over execution.
* Part 5: excessive degrees of freedom are especially costly when they remain in a consequential composition boundary. Recurring consequential variation is evidence that something treated as free may contain an undiscovered obligation.

Do not present the outcome as complete. Forty PDF passes remain DirectEditor; O365 edge projection remains incomplete; no runtime execution graph exists. Those residuals strengthen the example because the model now says explicitly where freedom remains.

⸻

PART 2 — MODELING

1. Preserve the existing §2.2 opening example

Keep the current document-mutation seam as the opening example of a small structural model.

It makes the simplest structural-model point cleanly:

one engineering question → one architectural relation → almost everything else suppressed.

Do not replace that with the computation graph. Instead, extend §2.2 after the existing purposeful-reduction discussion with a second example showing what happens when the structural question itself becomes richer.

The existing transition at the end of §2.2 currently moves directly to behavioral models. Replace that transition with the material below, then restore the transition afterward.

⸻

2. Add new subsection in §2.2

Proposed heading

2.2.1 When the Relationships Are the Model

Proposed prose

The document-mutation model asks where one kind of action belongs. A second structural question reaches further inside the remediation system:

What computations make up remediation, and how do they depend on one another?

DocAble processes a document through a collection of registered remediation passes. A pass may detect a condition, produce information another pass uses, decide whether remediation should proceed, mutate a bounded part of the intermediate representation, or directly edit a larger region. The implementation therefore contains a computation structure whether or not that structure has been modeled explicitly.

The first useful reduction is straightforward: treat each registered pass as a node. That preserves the computational units while suppressing the statements, library calls, loops, and other implementation detail inside them.

Remediation-computation model · Structural

* Engineering question — What consequential computations make up remediation, and how does information move among them?
* Model — a static directed graph whose nodes are registered computations and whose typed edges represent declared composition among them.
* Property — declared data dependencies and control dependencies are distinguishable and consistent with pipeline ordering; each modeled computation also states whether its effect is bounded as a typed patch, unbounded as a direct edit, or read-only.
* Quality attribute — analyzability, modifiability, and architectural integrity.

That sounds obvious after the fact. It was not obvious in the system.

An early version of the graph contained 113 nodes and two edges. The nodes were meaningful: the remediation passes already gave DocAble a stable decomposition into computations. The edges were not. They were two relationships somebody had written down by hand.

That asymmetry exposed a modeling gap. We had a useful answer to what computations exist? We did not yet have a useful answer to how do those computations compose?

Figure 2.2-X — The asymmetric model

          EARLY COMPUTATION MODEL
         registered remediation passes
                    │
                    │ identify
                    ▼
        ┌─────────────────────────┐
        │       113 NODES         │
        │                         │
        │  pass  pass  pass ...   │
        │                         │
        │     ─────►              │
        │               ─────►    │
        │                         │
        │   only 2 authored edges │
        └─────────────────────────┘
        GOOD ANSWER:
        "What computations exist?"
        POOR ANSWER:
        "How do they compose?"

Figure 2.2-X: An asymmetric structural model. DocAble already had a stable vocabulary of remediation computations, so the node projection was meaningful. The two hand-authored edges did not capture the composition among those computations. The mismatch identified a modeling gap rather than a graph-drawing problem.

The natural next move was to derive the missing relationships from what passes actually read and write. But that immediately raised a more important question:

What should an edge mean?

A first sweep found 33 producer–consumer relationships. Treating all 33 as one kind of dependency would have produced a graph, but not a very useful model. Most of the candidate edges came from passes reading values such as document signals or regime verdicts only to decide whether they should run. Those values did not contribute to the pass’s remediation output. They controlled execution.

The initial relation therefore contained two different semantics:

* one computation produces a value another uses to produce its result;
* one computation produces a value another uses only to decide whether to run.

Those are both dependencies. They are not the same dependency.

The model was refined accordingly. Each PDF pass now declares three sets over a typed facet vocabulary:

* Produces
* Consumes
* ConsumesForControl

The graph projects data edges from the first two and control edges from the first and third. The resulting static computation graph contains 10 DATA_FLOW edges, 22 CONTROL_GATE edges, and one CROSS_SERVICE data edge. The 11 payload-bearing edges are kept distinct from the 22 control gates.

Figure 2.2-X — Modeling the edge semantics

            WHAT DOES "DEPENDS ON" MEAN?
                  pass A
                    │
              produces FACET
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
       pass B               pass C
   reads FACET to        reads FACET only
   make its output       to decide whether
                         it should run
          │                   │
          ▼                   ▼
      DATA_FLOW           CONTROL_GATE
     payload-bearing      control relation

Figure 2.2-X: One implementation relation, two engineering meanings. A value consumed in another computation’s output creates a data dependency; a value consulted only to decide whether that computation executes creates a control dependency. Modeling the relations separately keeps the data graph from being dominated by routing information.

This is an important modeling pattern. The first representation need not contain the right ontology. Building it can expose distinctions that were previously implicit in the territory.

The progression here was:

What computations exist?
          │
          ▼
How do they depend on one another?
          │
          ▼
What kind of dependency is each one?

The engineering question became more precise, and the model changed with it.

That is not a failure of modeling. It is one of the things modeling is for.

⸻

3. Add node-effect classification immediately afterward

Proposed prose

The same exercise exposed a second dimension that an untyped node could not answer:

How bounded is the effect of this computation?

Not every pass changes the document in the same way. Some already produce a well-scoped typed patch onto the intermediate representation. Others mutate document state directly. Still others only analyze or validate.

The computation model now records that distinction as a mutation kind:

* 15 TypedPatchProducer passes produce a bounded typed change;
* 40 DirectEditor passes perform direct mutation whose effect is not yet represented as a typed patch;
* 13 ReadOnly passes do not mutate the document.

Figure 2.2-X — Same node grain, different effect semantics

              REMEDIATION COMPUTATIONS
                       │
          one node per registered pass
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
   TYPED PATCH      DIRECT EDIT    READ ONLY
    PRODUCER
       15              40             13
   bounded typed     mutation not    analysis /
      effect         yet reduced     detection /
                    to typed patch   validation

Figure 2.2-X: Effect boundedness is a modeled property of each computation. The graph keeps one node per registered pass while recording whether its consequential effect is a typed patch, a direct edit, or no mutation. The classification identifies where effect semantics are already bounded and where greater implementation freedom remains.

Do not describe DirectEditor as synonymous with defect.

The model says something narrower and more useful: the effect of these passes is not currently bounded by the typed-patch abstraction.

Some of that freedom may be appropriate. Some may eventually prove expensive. The classification makes the distinction inspectable instead of leaving it implicit.

This connects directly to degrees of freedom. A model should not eliminate every implementation choice merely because it can. But neither should an engineer mistake an unexamined implementation choice for a deliberately preserved freedom.

A useful model lets us ask which is which.

⸻

4. Add a concise lesson before returning to §2.3

Proposed prose

The completed computation graph illustrates three properties of purposeful reduction.

First, the existing decomposition matters. The graph could use one node per pass because the implementation had already acquired stable computational units. Modeling did not invent those units after the fact.

Second, relationships carry semantics of their own. A graph with the right nodes and meaningless edges is not an adequate model of composition. Distinguishing data flow from control gating made different engineering questions tractable.

Third, a model may expose remaining freedom without removing it. The mutation-kind classification does not require every direct editor to become a typed patch. It tells the engineer where the stronger abstraction already holds and where it does not.

The model is also deliberately static. It says nothing about which pass ran in a particular job, how long it took, what it cost, whether it retried, or which model fingerprint participated in the run. Those questions would require an execution model. Adding them here would make this model larger without making its structural question clearer.

The next chapter adds a different omitted dimension: time.

⸻

PART 2 — §2.8 SYSTEM KNOWLEDGE

5. Strengthen §2.8.2 “Maintain Explicit Correspondence”

The current derive/generate/trace taxonomy should remain. Make the computation graph the principal concrete example under:

Where the implementation is the source of truth, derive the model.

Replace or expand the current short example with this

Where the implementation is the source of truth, derive the model rather than maintaining the same fact independently.

DocAble’s remediation graph now does this for both nodes and edges. Registered passes supply the computational entities. Each PDF pass also declares typed Produces, Consumes, and ConsumesForControl facets. The graph projects its structural relations from those declarations:

V = project(\text{registered computations})

E = project(\text{typed composition})

A change to a pass’s declared IO therefore changes the projected edge set. There is no second list of data-flow edges for an engineer to remember to update.

Figure 2.8-X — Derive the descriptive model

             EXECUTABLE TERRITORY
       registered passes
              +
       typed pass declarations
       Produces
       Consumes
       ConsumesForControl
              │
              │ project
              ▼
       ┌───────────────────┐
       │ STATIC COMPUTATION│
       │       MODEL       │
       │                   │
       │ nodes + typed     │
       │ relations         │
       └───────────────────┘

Figure 2.8-X: Deriving a descriptive model. Where the implementation is authoritative for the fact being represented, DocAble projects the computation graph from registered passes and their typed composition declarations rather than maintaining a second independent account.

The graph is derived, but it remains a model.

It suppresses method bodies, internal algorithms, runtime history, timing, retries, and most document state. It preserves only the computational entities and relations needed for the structural questions it serves.

Derivation solves one correspondence problem by construction: an engineer does not separately author the edges. It does not establish that the underlying architecture is good, or that the declared relationships capture every engineering obligation that matters. Those are different claims.

Part III separates them.

⸻

PART 3 — ALIGNMENT

6. Extend §3.2.1 “Agreement Is Not Correctness”

The existing distinction among correspondence, conformance, and acceptance is strong. Add the computation graph immediately after the current DocAble worked example or use it to expand that worked example.

Proposed insertion

The remediation computation graph provides a sharper correspondence example because its correspondence became mechanically strong without changing which side has authority.

The C# pass registry and typed IO declarations remain the executable territory. The Python computation graph is a projected description of that territory. A blocking edge_projection_drift check fails if the graph projection and the declarations disagree.

That is strong correspondence.

It is not, by itself, conformance to an independent architectural obligation. The implementation may faithfully declare a dependency that an engineer would rather remove. A graph derived perfectly from an undesirable architecture is still a faithful graph of an undesirable architecture.

And the graph is not the executable pipeline. The runtime does not ask the graph what order to execute the passes in. The direction remains:

territory  ─────►  model

not:

model  ─────►  executable territory

The correspondence mechanism became stronger. The authority direction did not change.

Figure 3.2-X — Fidelity and authority are different axes

                    CORRESPONDENCE STRENGTH
         weak                                   strong
          │                                        │
          ▼                                        ▼
   hand-authored edges                  projected relations
      easy to drift                    + blocking parity check
                    AUTHORITY DIRECTION
      executable territory  ───────────────────►  model
                     UNCHANGED

Figure 3.2-X: Stronger correspondence does not require model authority. DocAble replaced hand-authored graph edges with relations projected from typed implementation declarations and made disagreement blocking. The model became more faithful to the territory without becoming the source from which the executable pipeline is generated.

This distinction matters because “model-based” does not imply one fixed authority architecture.

A model may be:

* descriptive and derived from implementation;
* authoritative and used to generate implementation;
* independently maintained and checked against implementation.

The engineering decision is not whether the artifact is called a model. It is what relationship that model has to the territory and what consequence disagreement carries.

⸻

7. Add a small projection-vs-generation figure

This is worth making explicit because readers with MBSE backgrounds will otherwise infer model→implementation authority.

Figure 3.2-X — Same model, different authority architecture

AS BUILT IN DOCAble
 C# passes + typed declarations
              │
              │ project
              ▼
      computation model
              ▲
              │
       blocking parity
       checks agreement
NOT THE CURRENT ARCHITECTURE
      computation model
              │
              │ generate
              ▼
       executable pipeline

Figure 3.2-X: Projection and generation encode opposite authority directions. DocAble currently projects its static computation model from executable declarations and checks correspondence. Generating the pipeline from the graph would instead give the model authority over execution. MAGE permits either relationship when justified; they are not interchangeable.

Follow-on prose

The distinction also explains why a blocking check does not make the graph executable.

A gate can give the correspondence obligation authority:

the projected model and the implementation declarations may not drift.

That is different from giving the model itself authority:

execution must be generated from this graph.

The first is the architecture DocAble currently uses.

⸻

8. Add O365 as the explicit residual

This should be a short paragraph, perhaps in the worked example or a footnote.

Proposed prose

The correspondence strength is not uniform across DocAble. PDF nodes and edges are projected and parity-enforced. For Office formats, node parity is enforced but edge projection is not yet built; the edge check remains audit-only. That asymmetry is useful to retain rather than conceal. The system can state exactly which model–implementation correspondences it claims to enforce and which remain weaker.

This is what it means to govern the model estate rather than simply possess one.

⸻

PART 5 — THE EVIDENCE

9. Placement

Add a substantial first-person field note in §5.3, where the chapter has already told the reader that finished architectures conceal the histories that produced them.

Best placement:

after §5.3.2 and the opening paragraphs of §5.3.3 “Two Paths to Durable Structure,” before the format-seam incident sequence.

Reason:

* §5.2 establishes scale and says engineering judgment moved into discovering abstractions and missing representation.
* §5.3 explicitly asks which structures were designed cleanly and which were forced by experience.
* The computation graph is neither a simple incident response nor a pristine upfront design. It is the best example of a partially good abstraction whose missing half became visible later.

Give it a field-note treatment rather than pretending it was part of the clean architecture from the beginning.

⸻

10. Proposed field note

Field note — I modeled the computations before I modeled their composition

I made one useful decision early in DocAble and missed the consequence of another.

The remediation core was organized as passes: identifiable units of computation, each responsible for some part of analyzing or changing a document. That decomposition turned out to be durable. When we later built a static computation graph, the pass registry gave us the nodes almost for free. We had already named the computations.

What I had not modeled nearly as well was their composition.

I had not required every pass to say, in a common vocabulary, what information it produced, what information it consumed to make its output, what it read only to decide whether it should run, or how bounded its mutations were. Those facts existed in code, but not as one explicit engineering model.

That difference matters more than I initially appreciated.

A pass is a convenient local boundary. If its composition contract is loose, an implementer has many locally reasonable ways to do the work: walk the document again, recover state that another pass already computed, read a shared structure directly, perform a mutation in place, or introduce another special case. Coding agents are very good at realizing one of those locally reasonable choices.

Across many passes, the choices compose.

In one region we ended up with work whose local complexity looked harmless but whose aggregate behavior approached O(N²) across an O(N)-pass pipeline because passes repeatedly rediscovered or retraversed state. Elsewhere, different passes performed mutations through different mechanisms. The problem was not that every implementation was individually foolish. The composition boundary admitted too many independent choices.

I had modeled the things that ran. I had left too much freedom in how they fit together.

That became obvious only when we tried to represent the computation graph honestly.

The first graph had 113 nodes and two edges.

The node count made sense. The edge count did not.

That mismatch was diagnostic. The system plainly contained more composition than the model represented. So we tried to derive the relationships from the passes themselves. The first sweep found 33 apparent producer–consumer edges.

Then the model forced another question: consumer in what sense?

Roughly two-thirds of those relationships were not data flow at all. A pass read a signal or verdict only inside routing logic such as ShouldRun or IsRouted. Treating those as ordinary data edges would have made the graph mostly control noise.

So the implementation acquired a distinction it had not previously expressed uniformly:

Produces
Consumes
ConsumesForControl

and the model acquired two corresponding relations:

DATA_FLOW
CONTROL_GATE

The data graph shrank to ten ordinary data-flow edges plus one cross-service payload edge. Twenty-two control dependencies remained visible, but separately.

The same process exposed another hidden choice. A pass could produce a bounded typed patch, directly mutate document state, or perform no mutation at all. We classified all 68 relevant pass sites:

15  TypedPatchProducer
40  DirectEditor
13  ReadOnly

That number did not tell us that the 40 direct editors were wrong.

It told us where we still had degrees of freedom.

Figure 5.3-X — The modeling history

           WHAT I HAD MODELED EARLY
          registered remediation passes
                     │
                     ▼
             stable computations
                 "the nodes"
            WHAT REMAINED TACIT
     produced state      control signals
            \               /
             \             /
              composition
             /     |      \
       mutation   reuse   traversal
       semantics          choices
             WHAT ACCUMULATED
       independently reasonable
          local realizations
                 │
                 ▼
      variation + repeated work
      + difficult impact reasoning
          WHAT MODELING EXPOSED
       113 nodes / 2 edges
                 │
                 ▼
       "the relations are missing"
                 │
                 ▼
       typed composition vocabulary
                 │
          ┌──────┴──────┐
          ▼             ▼
     DATA_FLOW      CONTROL_GATE
                 │
                 ▼
       mutation-kind classification

Figure 5.3-X: A partial model leaves a partial freedom surface. DocAble acquired stable remediation computations early, but their composition remained largely implicit. Modeling that composition later exposed distinct data and control relations, variation in mutation semantics, and a region in which locally reasonable implementation choices had accumulated global cost.

The final move was to stop maintaining those relationships as another hand-written truth.

The pass declarations now carry typed IO information, and the graph projects its edges from them. A blocking parity check fails if the declarations and projected graph disagree.

So the engineering progression was not:

no model
   ↓
model

It was:

partial model
   ↓
consequential variation
   ↓
missing relation becomes visible
   ↓
richer model
   ↓
typed implementation declarations
   ↓
projected model + checked correspondence

That distinction changed how I think about degrees of freedom.

Leaving an implementation choice open is often exactly right. If several realizations satisfy every obligation we care about, specifying one of them merely spends engineering effort and makes later change harder.

But freedom is not automatically benign merely because nobody wrote an obligation down.

An unmodeled choice can be genuinely free. It can also be unknown or tacit.

The computation graph gave us one practical signal for telling the difference: recurring consequential variation.

If independently reasonable implementations repeatedly create global cost, difficult coordination, or failures at the same seam, the system may be telling us that what looked like freedom actually contains an obligation we have not represented yet.

That does not mean “model everything.” It means look hardest where choices compose.

The hard part of this region was not that DocAble had many remediation computations. It was that their outputs, control decisions, traversals, and mutations interacted over the same artifact. That composition surface carried more engineering consequence than its early modeling reflected.

The work is still incomplete. Forty passes remain direct editors. Office-format edges are not yet projected the way PDF edges are. The graph is static; runtime invocation, duration, retries, cost, and model fingerprints belong to an execution model we have not built.

Those residuals matter. The point of modeling was not to drive every degree of freedom to zero.

It was to know where the freedom is.

⸻

PART 5 — OPTIONAL SHORT CALLBACK AFTER THE FIELD NOTE

Add this short paragraph to reconnect to the chapter’s main argument:

The episode also shows why a finished architecture can hide the engineering history that matters. The completed graph now looks like an ordinary typed structural model. Its history is less tidy: a durable computational decomposition existed first; composition semantics remained tacit; variation accumulated; trying to model the missing relationships exposed distinctions the implementation itself did not yet express uniformly. The finished model is therefore both an engineering artifact and a record of judgment that the system had previously required its implementers to reconstruct.

⸻

CROSS-PART CALLBACKS

Part 2 callback at §2.8.3

Near the existing discussion that Modeling makes properties available to Alignment, add:

The remediation graph supplied the structural property; its projection and parity machinery supplied correspondence evidence. Part III distinguishes that correspondence obligation from the separate question of whether the represented architecture is itself correct.

This prevents the graph example from being read as conformance merely because it has a blocking lint.

⸻

Part 3 callback in the validator/gate discussion

Where §3.3 discusses validators over call graphs and other model-derived evidence, add one sentence:

A correspondence validator can be authoritative about agreement without making either representation authoritative for execution: DocAble’s remediation-graph parity check blocks drift even though the executable pass declarations remain upstream of the projected graph.

⸻

FIGURE SET — CONSOLIDATED ASCII

The following figures are the recommended visual set. Do not use all of them if page pressure is high. Figures A, C, D, and E carry the strongest conceptual load.

Figure A — Partial structural model

            DOCABLE REMEDIATION
          113 modeled computations
                    │
                    ▼
     ┌─────────────────────────────┐
     │  ●  ●  ●  ●  ●  ●  ● ... │
     │       ╲                     │
     │        ─────►               │
     │                    ─────►   │
     └─────────────────────────────┘
          nodes: meaningful
          edges: 2 authored
     "What exists?"       ✓
     "How does it compose?"  ✗

Caption:

A partial structural model. The pass registry already supplied meaningful computational units, but two hand-authored relations could not represent their composition. The asymmetry identified a missing model surface.

⸻

Figure B — Edge semantics

                    FACET
                      ▲
                      │ produces
                   ┌─────┐
                   │  A  │
                   └─────┘
                    /   \
                   /     \
                  ▼       ▼
              ┌─────┐   ┌─────┐
              │  B  │   │  C  │
              └─────┘   └─────┘
                 │          │
       uses facet in     uses facet only
       produced output   to decide to run
                 │          │
                 ▼          ▼
            DATA_FLOW   CONTROL_GATE

Caption:

One read, two relations. Consumption that contributes to output and consumption that only gates execution are both dependencies, but they answer different engineering questions and belong to distinct relations.

⸻

Figure C — Model construction as discovery

WHAT COMPUTATIONS EXIST?
          │
          ▼
      node model
          │
          ▼
HOW DO THEY COMPOSE?
          │
          ▼
 candidate edges
          │
          ▼
WHAT DOES EACH EDGE MEAN?
          │
     ┌────┴────┐
     ▼         ▼
 data flow   control gate
          │
          ▼
HOW BOUNDED IS EACH EFFECT?
          │
   ┌──────┼──────┐
   ▼      ▼      ▼
 typed   direct  read
 patch   editor  only

Caption:

Model construction can discover semantics. Each attempt to answer the next engineering question forced a distinction that the previous representation did not contain.

⸻

Figure D — Projection without execution authority

       EXECUTABLE TERRITORY
    pass registry
         +
    typed declarations
         │
         │ project
         ▼
   ┌────────────────┐
   │ COMPUTATION    │
   │ GRAPH          │
   │                │
   │ 113 nodes      │
   │ 33 edges       │
   └────────────────┘
         ▲
         │
  BLOCKING parity
  checks correspondence
 AUTHORITY:   territory ─────► model
              model does NOT run pipeline

Caption:

Strong correspondence without model authority. The computation graph is projected from executable declarations and blocking-checked for drift. The model becomes harder to disagree with accidentally without becoming the executable pipeline.

⸻

Figure E — Two independent design decisions

            1. CORRESPONDENCE STRENGTH
      weak                              strong
 hand-authored                    projection
 model facts                 + blocking parity
              2. AUTHORITY DIRECTION
 territory  ─────────────────────────►  model
                     as built
 model      ─────────────────────────►  territory
                     generation
                     not as built

Caption:

Fidelity and authority are independent. DocAble strengthened the correspondence between computation model and implementation while retaining territory-to-model authority. Model-to-implementation generation would be a separate engineering decision.

⸻

Figure F — Where degrees of freedom remained

                 COMPUTATION
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       15 typed   40 direct   13 read-only
       patches     editors
          │          │
          │          └── greater unmodeled
          │              mutation freedom
          │
          └── bounded effect semantics

Caption:

Modeling makes remaining freedom visible. Mutation-kind classification does not declare direct editors incorrect; it distinguishes passes whose effects are already bounded by a typed patch abstraction from those whose mutation semantics remain more open.

⸻

CONCEPTUAL LANGUAGE TO CARRY FORWARD

The strongest reusable formulations from this episode are:

We had modeled the computations before we modeled their composition.

A graph becomes an engineering model when its edges mean something.

The model became more faithful without becoming more authoritative.

Modeling did not remove every degree of freedom. It made the remaining freedom visible.

Look hardest where choices compose.

And, for the theory discussion later in the book:

Recurring consequential variation is evidence that something treated as free may contain an undiscovered obligation.

That last sentence should not become a universal rule. It is a diagnostic heuristic. Variation can be legitimate. The signal is recurring consequential variation: repeated cost, failure, coordination burden, or structural inconsistency arising from choices made independently at the same seam.

⸻

CONSISTENCY / TERMINOLOGY RULES

Use computation graph or static computation graph for this model.

Do not call it an execution graph. Reserve execution graph for a possible future model containing runtime facts such as invocation, duration, retries, cost, model fingerprints, and observed divergence.

Use projected rather than generated for the graph. “Generated” risks implying model→implementation authority.

Use typed declarations for Produces, Consumes, and ConsumesForControl.

Use payload-bearing for DATA_FLOW and CROSS_SERVICE; explicitly exclude CONTROL_GATE.

Use correspondence for model↔territory agreement.

Do not say that graph parity establishes architectural correctness or conformance.

Use effect boundedness or mutation kind for TypedPatchProducer, DirectEditor, and ReadOnly.

Do not describe all direct editing as debt or defect.

Use degree of freedom only for the realization choices not currently constrained by an obligation. Where it is uncertain whether a choice is genuinely free, describe it as an unmodeled choice until the engineering question settles it.

⸻

WHAT THIS MATERIAL SUPERSEDES

Do not remove the existing Part 2 document-mutation structural model. It remains the cleanest first example of purposeful reduction.

The new material supersedes any weaker claim or implication that:

* DocAble’s graph edges are manually maintained;
* node alignment is mechanically strong while edge alignment remains inherently weaker for PDF;
* edge projection is only a future design;
* data and control dependency are one relation;
* pass effects are uniformly characterized;
* the computation graph is, or is intended to become automatically, the executable pipeline.

For PDF, the as-built state is now:

nodes                     113
projected edges            33
  DATA_FLOW                10
  CONTROL_GATE             22
  CROSS_SERVICE             1
payload-bearing edges      11
mutation-kind sites        68
  TypedPatchProducer       15
  DirectEditor             40
  ReadOnly                 13

The residual must remain explicit:

PDF node projection/parity      built / blocking
PDF edge projection/parity      built / blocking
O365 node parity                enforced
O365 edge projection            not yet built / audit-only
runtime execution graph         not built

⸻

FINAL RHETORICAL ARC

Across the three Parts, make the reader encounter the same artifact three times from three different directions.

Part 2 — Modeling

What representation makes the engineering question tractable?

The passes become nodes. Their composition becomes typed edges. Modeling reveals distinct edge semantics and effect boundedness.

Part 3 — Alignment

What relationship between model and territory earns authority?

Projection reduces independent truths. Blocking parity gives correspondence consequence. The graph remains descriptive rather than executable.

Part 5 — Evidence

Why did this representation have to emerge?

Because a stable computational decomposition coexisted with an under-modeled composition surface. Agents exercised that freedom independently. Global complexity accumulated. Modeling the composition exposed where the missing obligations were — and where freedom still legitimately remains.

That is a compact instance of the entire MAGE argument:

       consequential work
              │
              ▼
     recurring engineering
          difficulty
              │
              ▼
      ask what is missing
              │
       ┌──────┴──────┐
       ▼             ▼
 representation    authority
    problem         problem
       │             │
       ▼             ▼
     MODEL       ALIGNMENT
       └──────┬──────┘
              ▼
      durable structure

In this case, the first missing thing was representation.

The system knew what computations it had.

It did not yet know enough about how they composed.

The Part 5 placement is especially clean because the current manuscript already says that the feature list is less revealing than where engineering judgment went—specifically including “discovering abstractions” and distinguishing local defects from missing representation or authority. mage-book-Part5(20260819-112049).pdf And §5.3 explicitly warns that a finished architecture can make its structures look inevitable. mage-book-Part5(20260819-112049).pdf This episode is almost the ideal answer to that setup: the final graph looks obvious; its ontology was discovered by trying to model the thing accurately.

I also think the O(N²) point belongs exactly as written above: as a symptom of local freedom composing globally, not as a causal claim that “lack of modeling causes quadratic algorithms.” That restraint makes the broader DoF claim much stronger.
