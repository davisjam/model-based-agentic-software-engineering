The field note resolves the main node/edge/attribute questions. I think the remaining questions are about the boundaries and eventual authority of the model:

1. What exactly does a node denote?
    Is a NodeId a static task/pass kind, or can it denote a particular runtime invocation? For example, is pdf-region-segment the node, with individual page/job executions outside the model? My expectation is that this is a static computation graph, with a possible future execution graph instantiating its nodes. Is that the intended boundary? If so, please make it explicit.
2. What is the granularity rule for nodes?
    A pass may contain deterministic preparation, one or more GenAI calls, parsing, validation, fallback logic, and nontrivial algorithms. Meanwhile, determinism may naturally attach to a GenAI invocation while complexity may attach to an algorithm inside a pass. What determines when one of these becomes its own graph node rather than remaining implementation beneath a node?
    Can we state a stable rule such as: a node is the smallest independently governable computational stage exposed by the remediation architecture? I want to avoid node decomposition being determined accidentally by whichever governance concern happened to expose a seam first.
3. Does the graph model only data dependencies, deliberately excluding control dependencies?
    The field note makes the clean claim that edges represent typed data flow rather than governance semantics. Good. But how are ordering constraints, conditional execution, retries, fallback paths, fan-out/fan-in, or “run B only if A changed the document” represented? Are these deliberately outside this graph? Does MUTATION carry any control semantics?
    I would prefer that data flow remain clean and that control flow, if we ever model it, be an explicitly separate relation rather than gradually leaking into Edge.
4. Could there eventually be a runtime execution graph?
    If the current graph describes static computational structure, could a job instantiate it into an execution graph containing facts such as task invocation, input digest, duration, cost, seed/model fingerprint, output identity, retries, and measured divergence? I am not proposing that we build this now. I want to know whether the static model has been designed so that such an execution/provenance model could later refer back to NodeId cleanly rather than forcing runtime state into RemediationNode.
5. Can edge alignment eventually become as strong as node alignment?
    Nodes can be projected from PdfPassRegistry, but edges currently lack an equivalent EdgeRegistry, making edge alignment the deliberately weak/ratcheted facet. Could the actual typed producer/consumer composition eventually make edges mechanically derivable from the implementation? In other words, could we eventually have both:
    V = project(task registries)
    E = project(typed composition)
    rather than maintaining the edge set manually?
6. What is the intended long-term direction of authority between model and runtime?
    Today INV-GRAPH-DECL-INERT is explicit: runtime is authoritative and the graph is lint-time metadata, with portions projected territory → model. Is that intended as the permanent architecture, or merely the appropriate authority level today? Could selected portions eventually move toward model → runtime—for example configuration selection, composition, validation requirements, or even pipeline construction?
    I am not assuming that inversion is desirable. I want us to distinguish “deliberately descriptive forever” from “descriptive now, with authority available where it later pays.”

Please answer these as design questions rather than treating them as requests to expand scope. In particular, #4–#6 may legitimately have the answer “not now, but the present design preserves that option.” The important things to settle now are the semantic boundary of a node, the graph’s granularity rule, and what kinds of dependency the graph claims to represent.
