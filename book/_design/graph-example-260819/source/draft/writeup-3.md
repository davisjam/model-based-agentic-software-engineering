Yes — link them in Modeling, but keep them rigorously distinct. The new addendum actually sharpens the book because it gives you a natural static/dynamic pair.

The computation graph is a structural model of declared computation and composition. Record/replay is an execution/provenance record of realized mutation plus machinery for deterministically reapplying that record. They are related views of the same remediation system, but record/replay is not presently an execution graph, because the runtime edits are not linked back to the producing computation-graph NodeId. The file is explicit about that boundary. graph-edges-as-built-addendum-260819.md

I would therefore modify the treatment we just prepared in three places.

1. Part 2 structural models: add only a forward pointer

At the end of the computation-graph treatment, after saying that runtime facts belong to a different model, add roughly:

The static graph describes the declared computational structure, not one execution of it. DocAble also records the typed mutations produced during an actual remediation session. That record answers a different question — what happened to this artifact? — and belongs with the provenance model later in this Part. The two representations could eventually be joined through shared computation identity, but they are deliberately separate today.

This keeps §2.2 clean. Do not explain EditLog or replay there. The structural chapter should not suddenly become an execution-tracing chapter.

I would also slightly change our earlier sentence from:

Those questions would require an execution model.

to:

Those questions belong to an execution model or execution record. DocAble already records part of that runtime history, but it does not yet join that history to the static computation graph.

That is now more accurate, because saying “execution model not built” without qualification understates what record/replay already gives you. The addendum itself calls it a partial execution-graph instance. graph-edges-as-built-addendum-260819.md

2. Part 2 provenance: this is where they should actually meet

This is the important addition. Your existing provenance chapter already says that a run contains consequential operations, each recording target, mutation, pass, and evidence, and explicitly warns that the representation is not a trace of every function call. mage-book-Part2(20260819-112042).pdf Record/replay is a concrete realization of exactly that idea.

I would add a compact worked extension along these lines:

The execution record. DocAble’s PDF remediation path gives the provenance model an executable realization. During an actual session, typed document mutations are recorded as PdfEdit values in a per-session EditLog. The edit vocabulary is itself typed: rather than retaining arbitrary implementation traces, the record preserves consequential mutations at the abstraction used by the editor. An EditReplayEngine can later apply that edit sequence deterministically to an open document.

This record answers a different question from the static computation graph. The graph represents declared computational structure: which passes exist, what typed information they produce and consume, and which dependencies are data or control. The edit log records realized history: which typed mutations actually occurred during one session, and in what replayable sequence.

The two are not currently joined. In particular, PdfEdit.NodeId identifies a PDF structure element, not a computation-graph node. For a TypedPatchProducer, however, the runtime edits are the realized output of a modeled computation. If those records were explicitly attributed to the producing computation NodeId, one execution record could be interpreted against the static graph. DocAble preserves that design option without requiring it today.

That last distinction is critical because otherwise somebody will see NodeId on both sides and infer a linkage that does not exist. graph-edges-as-built-addendum-260819.md

Then give it a figure:

        TWO REDUCTIONS OF THE SAME REMEDIATION SYSTEM
        STATIC COMPUTATION MODEL
        "What is the declared computational structure?"
        pass A ──DATA_FLOW──► pass B
          │                     │
          └──CONTROL_GATE──► pass C
        nodes · typed IO · composition
                       │
                       │ possible future
                       │ shared computation identity
                       │
                       ▼
        ─ ─ ─ ─ ─ ─ not joined today ─ ─ ─ ─ ─ ─
                       ▲
                       │
                       │
        RUNTIME EXECUTION RECORD
        "What consequential mutation actually happened?"
        session
          │
          ├── PdfEdit
          ├── PdfEdit
          ├── PdfEdit
          └── PdfEdit
        typed mutations · realized order · replay

Caption: Static structure and realized history. The computation graph models declared computations and their typed composition; the per-session edit log records consequential mutations produced during one actual remediation. They are separate representations today. Explicit attribution from runtime edits to computation identities could later make an execution record an instance of the static model.

That figure is worth having. It teaches a very general modeling lesson: the system can support several purposeful reductions distinguished partly by time.

3. §2.8 heterogeneous substrate: connect them through identity, without pretending the identity exists yet

This is actually a lovely extension of the existing “six peer models joined through shared identity” argument. mage-book-Part2(20260819-112042).pdf

Add a paragraph along these lines:

Static and runtime representations need not collapse into one model either. A computation graph may identify a remediation pass and its declared relations, while a provenance record identifies the mutations realized during one run. Where a recurring engineering question requires joining them — for example, “which modeled computation produced this mutation?” — shared identity can connect the two. Where no such question pays for the linkage, they can remain separate. In DocAble that particular join is deliberately not yet modeled.

That is pure MAGE: connect models where the engineering question requires the relation, not because a grand unified graph looks elegant.

The resulting conceptual picture is:

                     SYSTEM KNOWLEDGE
              static                 realized
                │                       │
                ▼                       ▼
       COMPUTATION MODEL         PROVENANCE RECORD
       "what is declared?"       "what happened?"
                │                       │
       passes + typed IO          typed PdfEdit stream
       data/control edges         per-session ordering
                │                       │
                └──── shared identity? ┘
                         not yet built
                  join only when useful

And I’d sharpen our terminology slightly. The addendum says “graph models WHAT CAN happen.” graph-edges-as-built-addendum-260819.md For the book, I would not use that exact formulation. It is a little too strong because the static graph deliberately omits retry/fallback/fan-out and other execution semantics. graph-edges-as-built-addendum-260819.md I’d say:

Computation graph: what computations and typed composition are declared.

Execution/provenance record: what consequential mutations occurred in this run.

Future execution graph: how one actual execution instantiated the static computational structure.

That three-way distinction is cleaner.

There is also a very good Part 5 payoff. The record/replay system shows that the computation-graph story was not “we had no structure around mutations.” You actually had a strong typed runtime mutation vocabulary already: roughly 30 PdfEdit variants, recorded and replayable. graph-edges-as-built-addendum-260819.md What was missing was a different dimension: static composition semantics across passes. That makes the historical argument more precise:

I had modeled meaningful computations, and we had learned to record meaningful mutations. What remained under-modeled was the relationship between the two: how computations composed, which values crossed their boundaries, and how their effects should be bounded.

That’s much better than “we didn’t model enough.” You had modeled both ends — computations and consequential edits — while leaving too much of the middle/composition tacit.

And then the GT-test work is the first place these two worlds deliberately touch: typed-IO tells you where a per-node test begins, while record/replay removes model variance from the realized mutation side. graph-edges-as-built-addendum-260819.md That is an excellent Part 5 detail, because it shows the economic payoff of keeping the representations orthogonal: you can compose them later for a new engineering question without having prematurely fused them.

So: yes, link them. Absolutely do not merge them. The book gains a crisp trio:

static computation model → execution/provenance record → optional future execution graph

and an even stronger modeling principle:

Separate representations until a recurring engineering question makes their relationship worth modeling.
