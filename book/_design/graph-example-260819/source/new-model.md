Yes. I would treat this as a replacement of the §2.6 exemplar plus a deliberate Part III reprise, not as a local edit. The new model is valuable because it demonstrates several claims the manuscript already makes: model classes classify questions rather than data structures; representations can overlap classes; and shared identity lets heterogeneous models remain separate while joining where necessary.  

Editorial plan

1. Preserve the six-class ontology

Do not introduce “computation graph” as a seventh model class. Keep:

Structural · Behavioral · Ownership · Decision · Measurement · Provenance

The manuscript is already clear that these are classes of engineering questions, while graph/state-machine/table/etc. are representation forms. mage-book-Part2(20260819-001417).pdf

The computation graph is therefore a representation that supports several questions. In §2.6 we view it principally as a Measurement model:

Engineering question — What consequential computational properties characterize each task, and against what envelope should they be evaluated?

This is actually a better demonstration of the ontology than the existing cost example because the graph visibly crosses Structural and Measurement without threatening the taxonomy.

⸻

2. Replace the current §2.6 central exemplar

Current §2.6 uses GenAI cost/capacity: generation work produces usage and concurrency; those lead to cost/capacity and are compared against envelopes. mage-book-Part2(20260819-001417).pdf

Replace that with something provisionally titled:

2.6 Measurement Models: How Much, and Against What Bound?

Keep the chapter title unless the actual implementation suggests a better formulation.

Open with the ~322-second PDF incident, not the abstraction.

The narrative arc should be:

322s single-page stall
        │
        ▼
root cause:
repeated full-stream rescan
        │
        ▼
O(R²) behavior
        │
        ▼
piece-buffer fix
        │
        ▼
"Is this defect class elsewhere?"
        │
        ▼
walker-complexity audit
        │
        ├── S1/S2
        ├── N1
        └── N2 family
        │
        ▼
recurring engineering question
        │
        ▼
"What computation is this
 a property of?"
        │
        ▼
TASK / COMPUTATION GRAPH

This should be told compactly. The point is not performance engineering. The point is the emergence of a model from recurring judgment.

The chapter should explicitly identify the transition:

The first incident required debugging. The recurrence exposed a modeling problem. Complexity was a consequential property of pipeline computations, but the computations lacked a shared identity against which that property could be represented and queried.

That is the MAGE move.

⸻

3. Introduce the second incident immediately afterward

Then introduce the 33-versus-82 region-count nondeterminism.

This should initially look unrelated.

The determinism effort asks something like:

How much may the output of this GenAI computation vary under equivalent inputs?

And then reveal the convergence:

The complexity audit and the determinism investigation appeared to concern different properties. They needed the same missing abstraction: a stable identity for the computation whose behavior was being measured.

That’s the chapter’s conceptual hinge.

⸻

4. Introduce the computation graph

The ontology needs to be extremely crisp.

Nodes

A node is a computation/task/transformation.

Every node has:

* stable NodeId;
* NodeKind;
* pointers necessary to locate/associate it with realization.

NodeKind at minimum distinguishes deterministic and GenAI computation, assuming that is what the implementation actually does.

Edges

An edge is data flow between computations, carrying the contract of the exchanged value/artifact.

Do not encode “deterministic computation” on edges.

The design-history correction is pedagogically valuable:

An early representation treated GenAI calls as nodes and deterministic work as edges. That representation failed because most pipeline work is itself computation. The corrected model makes every task a node and reserves edges for the data-flow contracts between tasks.

This is a terrific miniature example of model design itself requiring judgment.

Contracts

Where supported by the implementation:

* in-memory edge → class/type symbol;
* serialized edge → serialization/wire contract;
* unresolved serialized contract → explicit absence/backlog rather than invented precision.

The exact contract_ref=None semantics need confirmation from the orchestrator before publication.

⸻

5. Make attributes orthogonal to the graph

This is theoretically important enough for a figure.

                   COMPUTATION GRAPH
  Node A ───────────▶ Node B ───────────▶ Node C
    │                    │                   │
    │                    │                   │
 NodeId=A              NodeId=B            NodeId=C
    │                    │                   │
    └──────────────┬─────┴──────────┬────────┘
                   │                │
             ATTRIBUTE PROVIDERS
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  complexity    tolerance     cost
     model        model       model

Do not make the graph schema accumulate complexity, tolerance, cost, latency, etc. as first-class node fields unless the actual implementation contradicts our understanding.

The architectural lesson is:

Stable identity permits orthogonal models to describe the same computation without collapsing them into one universal schema.

That anticipates §2.8 beautifully, whose current argument is precisely that DocAble’s models remain heterogeneous while joining through shared identities. mage-book-Part2(20260819-001417).pdf

⸻

6. Work two measurement models over the same substrate

This is where §2.6 becomes much stronger.

Deterministic computation

Property:

Scaling behavior should remain within the declared complexity envelope.

Evidence should include the actual ratio methodology:

N       25    50    100    150
        │     │      │      │
        └──── cost / unit ───┘
O(N) expectation:
cost per unit ≈ constant
O(N²) regression:
cost per unit grows with N

Crucially, preserve the negative control.

The compelling result isn’t:

HEAD passes a performance test.

It is:

The repaired implementation passes; restoring the known-bad implementation makes the same probe fail; the test size was then increased to widen the discriminating margin.

That’s exceptionally good alignment evidence.

GenAI computation

Property:

Equivalent executions may vary, but only within an explicitly characterized behavioral tolerance.

Then show the actual calibration methodology once the orchestrator supplies it.

I would avoid forcing symmetry beyond what the evidence supports. Complexity and GenAI tolerance are analogous because both are measured properties attached to computations. Their statistics and semantics need not be symmetrical.

⸻

7. Keep cost/capacity, but demote it

Do not discard the existing lesson. The current model correctly distinguishes a measured quantity from its separately declared reference envelope. mage-book-Part2.pdf

Make cost another provider:

NodeId
  ├── complexity
  ├── behavioral tolerance
  ├── cost
  └── latency

One paragraph is enough:

Nothing makes complexity or behavioral tolerance privileged. The same stable node identity can support cost, latency, resource consumption, or other quantitative views as engineering questions arise.

That preserves the existing chapter’s useful content without spending three figures on it.

⸻

8. Explicitly connect to degrees of freedom

Add a short paragraph near the end of §2.6.

This example makes the concept unusually concrete:

The model does not specify how each task must be implemented. A deterministic task may remain free to change implementation while preserving its functional contract and scaling obligation. A GenAI task may remain free to vary within its accepted behavioral envelope. The model constrains consequential degrees of freedom without eliminating realization freedom.

This belongs here because readers can finally see what preservation of DoF means rather than merely understand the definition.

⸻

9. Strengthen §2.8 using this example

The current §2.8 already says exactly the right thing: no universal model; heterogeneous representations joined through shared identity. mage-book-Part2(20260819-001417).pdf

Add the computation graph as a callback.

Something like:

The computation graph from §2.6 illustrated the same pattern at smaller scale. A task’s stable identity joined complexity, tolerance, and cost models without requiring those concerns to become fields of one universal task schema.

That will make §2.8 feel earned rather than merely asserted.

⸻

Part III editorial reprise

Do not retell the incident.

Part III should reopen the same graph and ask the fifth question the book already promises:

What gives the property authority?

Part II currently says explicitly that modeling makes properties explicit while Alignment gives selected properties consequence. mage-book-Part2(20260819-001417).pdf This becomes perhaps the cleanest worked example of that distinction.

Use the same visual grammar:

PART II · MODEL
deterministic node                GenAI node
complexity = O(P)                 tolerance = τ
       │                               │
       ▼                               ▼
PART III · ALIGNMENT
scaling probe                     calibration/evaluator
       │                               │
negative control                  acceptance envelope
       │                               │
       ▼                               ▼
       consequence / gate / evidence

And make the lesson:

The model determines what property can be stated. The property determines what evidence can establish it. Alignment determines what consequence that evidence receives.

That line is worth considering as canonical language.

⸻

Questions for the DocAble orchestrator

I would send the orchestrator the following as a research request. Ask for receipts, not interpretation. We can do the interpretation.

We are preparing a worked modeling example for the MAGE book based on the emerging DocAble computation/task graph. Please produce a source-grounded field note. Do not optimize for narrative or for agreement with the framing below. Correct any premise that is inaccurate.

For every substantive claim, provide concrete repository evidence: file paths, symbols, tests, commits/Epics/issues where available, and short code/schema excerpts where useful.

1. The originating complexity incident

Reconstruct the incident involving the approximately 322-second pure-CPU stall on a single PDF page.

Answer:

* What exact operation stalled?
* What component/symbol was responsible? Confirm whether PdfPageContentScanner is the correct name.
* What was the algorithmic pathology?
* Is “O(R²) rescan-per-mutation” an accurate characterization? Define R precisely.
* Why did each mutation trigger a re-scan/re-walk?
* What was the fix?
* Is “batch edits into a piece buffer, materialize once” technically accurate?
* What were the measured before/after results?
* Which commits/tests/files provide receipts?

Distinguish measured facts from inferred asymptotic complexity.

2. Generalization into a complexity audit

Reconstruct how that incident became a broader directive/audit.

* What was the exact directive or Epic?
* What recurring defect class was sought?
* Was the intended pattern accurately described as “a per-item full-collection rebuild/re-walk inside a loop whose iteration count scales with document size”?
* What did the audit inspect?
* What did it find?

For each candidate currently called S1, S2, N1, and N2, provide:

* actual component/symbol;
* input-size variable;
* old algorithm;
* old expected/as-measured complexity;
* replacement algorithm, if shipped;
* new expected/as-measured complexity;
* status: fixed / identified / deferred / false positive / other;
* repository receipts.

In particular, verify or correct:

* S1/S2: O(P²) in page count on the v2 struct path;
* N1: per-chunk full-PPTX-deck rewrite producing O(slides²) behavior on multi-chunk jobs;
* N2: page-resolution family.

3. Complexity pin-tests

For each shipped complexity fix, document the scaling test.

We need to understand:

* exact N values tested;
* what cost/time/work quantity is measured;
* how cost-per-page or equivalent is computed;
* what ratio is calculated;
* threshold for passing;
* why a ratio test was chosen instead of an absolute runtime threshold;
* sources of measurement noise;
* whether the test is CI-safe and, if so, why.

Provide actual observed values where retained.

Verify or correct the current recollection that probes use approximately:

N = 25 / 50 / 100 / 150

and test for approximately constant cost per unit.

4. Negative controls and falsification

This is particularly important.

For each complexity probe:

* Was the old/broken implementation deliberately restored?
* Did the new probe fail against it?
* What ratios/results were observed?
* Did the repaired HEAD pass the same probe?
* Was N increased from 100 to 150 specifically to increase discrimination margin?
* Verify or correct recollections of broken ratios around 4.4 / 3.2 and a later broken-S1 result around 4.1×, versus HEAD around 1.1–1.8.
* What exactly does each ratio mean?

Determine whether this became an explicit standing engineering rule: every complexity fix must demonstrate a negative control before its Epic closes. If so, identify where that rule is represented and how authoritative it is.

5. The GenAI nondeterminism incident

Reconstruct the incident remembered as “33 vs. 82 region count.”

* Which GenAI operation produced these outputs?
* Were the inputs genuinely identical? Define what was held constant.
* What exactly were 33 and 82 counts of?
* Was this expected stochastic variation, a defect, or evidence that the system lacked a declared tolerance?
* What downstream consequence made the variation consequential?
* What investigation/Epic followed?
* What repository artifacts document it?

Do not call this a defect unless the evidence supports that characterization.

6. GenAI tolerance/calibration model

Describe the current or intended model for behavioral tolerance of GenAI nodes.

For each implemented tolerance concept:

* What quantity is measured?
* Over how many repeated runs?
* Under what controlled inputs/configuration?
* What statistic or distribution is retained?
* What constitutes acceptable variation?
* Is the bound empirical, manually chosen, derived, or adaptive?
* What happens when behavior exceeds it?
* Is the measurement observational, advisory, gating, or something else?
* Where is the model represented?
* Where are calibration results represented?

Clarify the project’s actual terminology: determinism, tolerance, behavioral tolerance, variance, calibration, or something else.

7. Computation/task graph ontology

Describe the graph as it actually exists or is currently being implemented.

For nodes, provide:

* schema/type;
* stable identity mechanism;
* meaning of NodeId;
* allowed NodeKind values;
* pointers/references retained on a node;
* whether a node means task, transformation, pass, call, computation, or something more precise.

Verify the intended claim:

A node represents a computation/task regardless of whether its realization is deterministic or GenAI.

For edges, provide:

* schema/type;
* semantics;
* direction;
* whether edges represent data flow;
* how input/output contracts are represented;
* whether control flow is represented separately or not at all.

Verify the intended claim:

An edge represents data flow and its contract, not deterministic computation.

8. Design-history corrections

Reconstruct the design discussion if receipts exist.

In particular:

1. Was an earlier design approximately “GenAI operations are nodes; deterministic operations are edges”?
2. Why was that rejected?
3. Was the key correction that most pipeline passes are themselves algorithmic computations and therefore belong as nodes?
4. What alternatives were considered for node attributes?
5. Why was the final design based on identity/pointers plus provider-owned attributes rather than accumulating fields directly on the node?

Capture the engineering reasoning, not merely the final schema.

9. Typed edge contracts

Document exactly how edge contracts work.

Verify or correct:

* in-memory values can identify a class/type symbol;
* serialized values can identify a serialization/wire contract;
* existing wire-contract representations are reused rather than duplicated;
* a node’s output type can be understood through the contract on its outgoing edge;
* contract_ref=None has a specific meaning.

Most importantly: determine exactly what contract_ref=None means. Is it:

* genuinely untyped data;
* contract unknown/not yet modeled;
* no serialized boundary;
* not applicable;
* technical debt/backlog;
* something else?

We should not turn absence of metadata into stronger semantics than the implementation supports.

10. Attribute-provider architecture

Describe how orthogonal properties attach to nodes.

We currently believe the intended design is approximately:

NodeId → independently maintained attribute providers

with providers for concerns such as:

* complexity;
* GenAI tolerance/determinism;
* cost;
* perhaps latency or others.

Verify:

* which providers actually exist;
* which are planned only;
* storage/file layout;
* join mechanism;
* validation of references;
* behavior for missing attributes;
* whether adding a new provider requires modification to the core graph schema.

Test the claim:

A fifth engineering concern can be added as another provider with little or no churn to the graph itself.

If false or overstated, explain precisely why.

11. Relationship to existing DocAble models

Determine whether the task graph:

* reuses existing component/service/pass identities;
* introduces a new identity namespace;
* maps to the existing model substrate;
* overlaps existing structural, journey, flow, provenance, cost, or governance models.

Give concrete examples of joins.

We particularly want to know whether the same task/node identity can connect to provenance records, implementation symbols, tests, cost measurements, or other existing models.

12. What questions does the graph make newly cheap?

Without adopting MAGE terminology unless it already exists in the repo, identify concrete queries that become possible or substantially cheaper because the graph exists.

Candidates include:

* Which tasks have known superlinear behavior?
* Which GenAI tasks lack calibrated tolerance?
* Which tasks lie on a particular artifact path?
* Which serialized edges lack modeled contracts?
* Where can nondeterminism enter this pipeline?
* Which expensive nodes affect a particular output?
* Which nodes lack complexity evidence?
* Which tests establish a node’s computational properties?

For each supported query, show how it can actually be answered from repository artifacts.

13. Degrees of implementation freedom

Investigate whether the repository evidence supports this interpretation:

The graph and its attribute models constrain consequential properties without prescribing complete implementations. A deterministic task may change implementation while retaining its contracts and scaling obligation; a GenAI task may vary while remaining within its accepted behavioral envelope.

Identify concrete examples where an implementation could change without requiring the represented obligation to change.

Do not force this interpretation if the implementation does not support it.

14. Modeling-to-alignment chain

For the strongest deterministic and GenAI examples, produce a compact evidence chain:

incident → recurring question → represented entity → explicit property → measurement/evaluator → consequence

Separate each step and identify its repository receipt.

For the deterministic complexity case, include the negative control.

For the GenAI case, state explicitly if the final consequence/gate has not yet been implemented.

15. Current implementation status

Finally, distinguish clearly among:

* shipped;
* implemented but not yet merged;
* under active implementation;
* designed but not implemented;
* proposed only in discussion.

The book must not present design intent as production fact.

End with a fact table containing the strongest 10–20 claims suitable for publication, each with:

Claim | Status | Evidence | Caveat

Also include a short section titled “Premises in this request that were wrong or overstated.” We specifically want contradictions surfaced rather than smoothed over.

That should give us enough to write §2.6 without hand-waving and enough material to decide exactly what Part III can legitimately claim. The most important receipts are the negative controls and the point at which two independent engineering efforts converge on NodeId: those are what turn this from “nice graph architecture” into a worked MAGE example.
