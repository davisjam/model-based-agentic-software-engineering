# Boundary + authority — answers to the 6 follow-up design questions (260818)

*Answers to `more-questions.md`. Each is a **design decision**, not a scope-expansion
request. Every load-bearing claim carries a repository receipt (`file:line` / symbol)
verified against `main` @ HEAD on 260818. Questions **1–3 are SETTLED** (the semantic
boundary of a node, the granularity rule, the dependency kinds — the things the user
asked to settle now). Questions **4–6 are answered as PRESERVED-OPTION** — "not now, but
the present design preserves that option," each with the concrete code evidence that the
option is in fact preserved. I do not propose building 4–6.*

Primary source under test: `system-models/remediation_graph.py` (1194 lines). Companion
receipts: `system-models/remediation_graph_tolerance_provider.py`,
`tools/lint/lint-remediation-graph-parity.py`, and the field note
`docs/field-notes/remediation-graph-substrate-journey-260818.md`.

---

## 1. What exactly does a node denote? — **SETTLED: a static task/pass KIND, never a runtime invocation.**

**Decision.** A `NodeId` denotes a **static remediation-pass kind**. `pdf-region-segment`
(live: `pdf-intra-page-vision-fuse`, `pdf-struct-alt-text-gen-ai`, …) IS the node; a
*particular execution* of that pass — on page 7 of job 1234 — lives **outside** this
model. The substrate is a **static computation graph**; a future execution graph (Q4)
would instantiate its nodes. That is exactly the boundary the user expected, and it is
what the code already does. I make it explicit here.

**This is confirmed in code, not aspiration:**

- **`RemediationNode` carries identity + coloring + POINTERS ONLY — zero runtime fields**
  (`remediation_graph.py:261-288`). The fields are `id`, `kind`, `phase_ref`,
  `genai_tasks`, `seam_cite`, `format`. There is **no** `duration`, `invocation_id`,
  `input_digest`, `seed`, `model_fingerprint`, `output_identity`, or `retry_count`. The
  docstring is explicit: *"Carries identity + coloring + POINTERS ONLY"* (`:265-267`).
- **`NodeId = str  # a stable pass slug`** (`:155`), derived from the C# pass **class
  name** by `slug_for_pass` (`:325-329`, e.g. `PdfStructAltTextGenAiPass` →
  `pdf-struct-alt-text-gen-ai`). A slug of a *kind*, not an execution handle.
- **The node SET is PROJECTED from the pass registry, not the run log.**
  `read_live_pass_slugs()` (`:873-885`) reads every `new <Name>Pass()` instantiation from
  the cited C# `PdfPassRegistry` and slugifies it. The population is the set of pass
  *kinds* the architecture registers — 113 nodes (56 PDF + 26 PPTX + 18 DOCX + 13 XLSX;
  capstone), one per registered pass, never one per page/job execution.
- **INV-GRAPH-DECL-INERT — the model never runs anything.** The declarations are never on
  the runtime path (`:1143-1172`); `runtime_path_references()` is the probe that a runtime
  module can never READ the graph. The model **names** the pipeline; it does not
  **execute** it. A node therefore *cannot* denote an invocation, because nothing in the
  model is ever invoked.

**The explicit boundary (new, requested):**

> **STATIC computation graph (this model)** — vertices are pass *kinds* (`NodeId`), inert
> metadata, one per registered pass, projected territory→model. **FUTURE execution graph
> (Q4, not built)** — vertices are pass *invocations* (a run of a `NodeId` on a specific
> input), carrying digest/duration/cost/seed/output-identity/retries, keyed **by** `NodeId`
> as a foreign key. The static node is the *type*; an execution is an *instance* of that
> type. The static model holds no instance state, which is precisely why the instance model
> can be added later without touching it (Q4).

---

## 2. What is the granularity rule for nodes? — **SETTLED: a node is exactly a registered pass; sub-pass governance attaches as an ATTRIBUTE, never as a new node.**

**The user's proposed rule** — *"a node is the smallest independently governable
computational stage exposed by the remediation architecture"* — is **ADOPTED, with one
sharpening that makes it stable and non-accidental:**

> **A node is exactly a stage the remediation architecture already registers as a pass**
> (a `new <Name>Pass()` instantiation in `PdfPassRegistry`, or a `<Fmt>PassId` enum member
> for O365). "Smallest independently governable stage" is operationalized as "the stage
> the architecture already exposes as an independently-registered pass." Governability
> *below* that granularity is expressed as an **attribute cite**, not a new node.

**Why this resolves the user's real worry** ("node decomposition must not be decided
accidentally by whichever governance concern exposed a seam first"):

- **The node boundary is DERIVED (projected), not authored by a governance concern.** The
  node set = `read_live_pass_slugs()` over `PdfPassRegistry` (`:873-885`); parity is
  enforced by `node_parity_drift()` (`:899`) and the parity lint
  (`lint-remediation-graph-parity.py:86-89`). A governance concern (determinism vs
  complexity) therefore **cannot mint a node** — it can only attach an attribute to a node
  that the *registry* already exposes. The seam that a governance concern discovers does
  not become a vertex; only a *registered pass* becomes a vertex.
- **The reconciliation the user asked for** — "determinism attaches to a GenAI invocation
  while complexity attaches to an inner algorithm; when does an inner stage become its own
  node vs stay implementation-beneath-a-node?":
  - **Determinism** attaches via the tolerance provider, keyed by `NodeId`
    (`remediation_graph_tolerance_provider.py:176` `_NODE_METRIC: dict[NodeId, …]`,
    `:266` `value_for(node_id)`). It does **not** split a pass into a "GenAI-call
    sub-node."
  - **Complexity** attaches via the complexity provider, keyed by `NodeId` and
    joined at a finer `file::symbol` **`seam_cite`** (`:281-283`). The `seam_cite` field is
    the escape valve that lets an attribute point at an *inner* algorithm **without
    promoting it to a node**.
  - **So an inner stage becomes its own node IFF — and only IFF — the pass registry
    exposes it as its own registered pass.** Otherwise the concern gets sub-node
    *precision* through `seam_cite` + provider keying, while the node *set* stays pinned to
    the registry projection. Determinism and complexity thus attach at *different
    granularities* (whole-node vs inner-symbol) **without disagreeing about what a node
    is** — because neither one defines the node; the registry does.
- **The rule is stable AND self-maintaining.** Because the node set is projected, if the
  architecture ever *does* decompose a pass into two registered passes, the node set
  follows automatically (parity lint flags `MISSING_IN_MODEL`,
  `NodeParityDrift.MISSING_IN_MODEL` `:891-893`). No governance concern gets a unilateral
  vote on decomposition; the pass registry is the single arbiter.

---

## 3. Data dependencies only? — **SETTLED: yes. Edge models typed data flow; control flow is deliberately OUTSIDE the graph, and MUTATION is data-typed, not control-typed.**

**Decision.** The graph models **data dependencies** (typed producer→consumer data flow)
and **deliberately excludes control**. Confirmed:

- **`Edge` is a typed data-flow contract, nothing more** (`:291-309`): `producer`,
  `consumer`, `contract_ref` (a `wire-contracts/<stem>.schema.json` stem — the typed
  contract SSOT), `kind`. The docstring: *"A typed data-flow contract between two nodes."*
  The field note states the design intent verbatim: *"edges = data-flow + I/O format only
  — an edge carries no governance semantics of its own"* (`journey:148-156`).
- **`EdgeKind`** (`:217-229`) = `{DATA_FLOW, MUTATION, CROSS_SERVICE}` — all three are
  *data/contract* discriminators (which contract mechanism applies), not control
  discriminators.

**Where ordering / conditional / retries / fallback / fan-out-in / "run B only if A changed
the doc" live — OUTSIDE this graph:**

- **Coarse ordering** is a *pointer*, not an edge: `phase_ref` cites a
  `remediation_pipeline_phases.PhaseId` value (`:275-277`) — the phase model carries the
  stage ordering, the graph merely points at it (rule #42, "pointer, not a re-model").
- **Conditional execution, retries, fallback, fan-out/fan-in, "run B only if A mutated the
  doc"** are **runtime control semantics** and are represented **nowhere in this model**.
  They live in the actual runtime — the C# pass-registry execution order and
  `web/chunking/` (fan-out/fan-in, recovery, re-drive). None of it is leaked into `Edge`.
  This is by design and matches the user's stated preference (keep data flow clean; model
  control, if ever, as an explicitly separate relation).

**Does MUTATION carry control semantics? — No, and it should stay that way.**
`EdgeKind.MUTATION` (`:224-226`) is *"an in-process state write — references a
`state_mutator_registry` write-authority contract, NOT a wire-contract JSON shape."* That
is a **data/state relationship** (which write-authority contract governs the shared-state
write), typed by a contract — it names **what data authority is exercised**, not
**when/whether** a pass runs. It is data-flow-typed, not control-flow-typed.

**Recommendation (ratifies the user's preference):** if control flow is ever modeled, it
MUST be an **explicitly separate relation** (e.g. a distinct control/ordering relation or a
conditional-guard model keyed by `NodeId`), **never a new `EdgeKind` on `Edge`**. Keeping
`Edge` permanently data-flow-typed is the invariant that prevents control from "gradually
leaking into Edge."

---

## 4. Could there eventually be a runtime execution graph? — **PRESERVED-OPTION (not now). The design preserves it cleanly; there is already a shipped precedent.**

**Answer.** Yes — a job could instantiate the static graph into an **execution graph**
(invocation, input digest, duration, cost, seed/model-fingerprint, output identity,
retries, measured divergence). **Do not build it now.** The static model has been designed
so such an execution/provenance model can refer back to `NodeId` cleanly **without forcing
runtime state into `RemediationNode`** — and the evidence that the option is preserved is
concrete, not hopeful:

- **The inert node IS the enabler.** `RemediationNode` has zero runtime fields
  (`:261-288`, Q1). An `ExecutionRecord` can therefore carry `node_id` as a **foreign key**
  plus its own invocation/digest/duration/cost/seed/output-identity/retry columns, joining
  to the static graph by `NodeId`, with nothing to migrate out of the node.
- **There is already a working precedent: per-run measured facts keyed by `NodeId`, living
  OUTSIDE `RemediationNode`.** The tolerance scorecard records **per-run structural
  divergence keyed by node**: `_NODE_METRIC: dict[NodeId, StructuralDiffMetricId]`
  (`remediation_graph_tolerance_provider.py:176`), `metric_for_node(node)` (`:187`),
  `value_for(node_id)` (`:266`), `covered_nodes() -> frozenset[NodeId]` (`:275`). This is
  the Q4 provenance seed **already shipped**: a per-run *measured* fact (divergence across
  K runs on a held-constant input) is keyed by `NodeId` and stored in a sibling model, not
  as a node field. An execution graph is the *generalization* of exactly this pattern.
- **The attribute-provider registry is the architectural template.** Providers are a
  side-table keyed by `NodeId` (`AttributeProviderRegistry` `:790`), decoupled from the
  node — *"providers are keyed by `NodeId`, not fields on the node"* (capstone). An
  execution/provenance model is structurally "another `NodeId`-keyed consumer."

**Decision:** PRESERVED. Not now. No runtime state ever need enter `RemediationNode`; the
inert node + `NodeId` join key + the already-shipped per-run-divergence-keyed-by-node
scorecard are the standing evidence the option is real.

---

## 5. Can edge alignment become as strong as node alignment? — **PRESERVED-OPTION / aspirational. Coherent, and the model is shaped for it, but it is gated on a typed-IO surface that does not exist yet.**

**Today's asymmetry (confirmed).** Nodes satisfy **V = project(task registries)**:
`read_live_pass_slugs()` reads `PdfPassRegistry` live (`:873-885`) — the node set cannot be
hand-copied wrong. **Edges have no equivalent `EdgeRegistry`**: `EDGES` is a hand-declared
tuple of exactly **2** edges (`:708-721`). The field note names this the *"EDGE RATCHET
(WEAK — the honestly-weak facet): the territory has no `EdgeRegistry` to project edges
from, so edge alignment is runtime/ratchet-based, not generative"* (`journey:234-237`).

**Could E = project(typed composition) become mechanically derivable?** Yes in principle —
the direction mirrors the proven node mechanism. **What would have to be true:** a **typed
IO-contract surface the compiler already sees** — each pass would have to statically
declare its input and output types (e.g. a `Pass<TIn, TOut>` signature, or an explicit
typed producer/consumer registration), so that "which pass's output type feeds which pass's
input type" is derivable by *reading types*, the way `read_live_pass_slugs` derives the node
set by reading `new <Name>Pass()`. Today passes register as bare `new <Name>Pass()` with no
statically-exposed IO type pair, so the composition — and thus the edge set — cannot be
projected.

**Assessment.** The option is architecturally **coherent** and the model is already
**shaped** for it: `Edge.contract_ref` already points at the `wire-contracts/*.schema.json`
SSOT (`:305-307`), so if passes exposed typed IO, generated edges would point at those same
contracts with no new edge-schema format. But it **requires a producer/consumer typing
effort on the C# pass surface that does not exist yet**. PRESERVED as a coherent future
direction (E = project(typed composition)), gated on making pass IO statically visible; NOT
buildable today. Do not build now.

---

## 6. Long-term direction of authority (model vs runtime)? — **PRESERVED-OPTION, per-portion. "Descriptive now, with authority available where it later pays" — NOT "descriptive forever," except for the node-set projection itself.**

**Today (confirmed).** INV-GRAPH-DECL-INERT: runtime is authoritative, the graph is
lint-time metadata, portions projected territory→model (`:1143-1172`; field note `:216-219`).
The correct answer is **per-portion**, not a single global verdict:

**(a) DESCRIPTIVE FOREVER — keep territory→model:**

- **The node SET and its parity.** Inverting this (making the graph the authority for
  *which passes exist*) would duplicate the runtime `PdfPassRegistry` and re-introduce the
  exact drift the projection exists to kill (`read_live_pass_slugs` `:873-885`; parity lint).
  The node set must stay descriptive/projected.

**(b) DESCRIPTIVE NOW, AUTHORITY AVAILABLE WHERE IT LATER PAYS — could move model→runtime,
per portion, ordered by first-payer:**

1. **Config selection (first-payer).** `derive_config_kind` / `_KIND_TO_CONFIG` (`:743-761`)
   is a **TOTAL, type-exclusive** map `NodeKind → GenAiConfigKind`. Today it is a lint-time
   assertion (INV-GRAPH-CONFIG-EXCLUSIVE). It is the strongest inversion candidate: the
   runtime could **read** the node's kind→config selection at pass-construction time so a
   structural node **cannot be handed a creative config by construction** (make-error-
   impossible), rather than a lint catching it after the fact. The map is already total and
   pure — that purity is the enabler for a safe authority inversion (A.8/A.22).
2. **Validation requirements.** The tolerance provider already yields a per-node budget
   (`tolerance_of` / `value_for(node_id)` `:266`); a runtime gate could **consume** the
   budget to enforce the variance ε at run time, rather than only measuring it offline —
   the budget becoming the runtime source of truth for "is this run within tolerance."
3. **Composition / pipeline construction (last-payer).** This is the farthest reach and is
   **gated on Q5**: the graph cannot drive pipeline construction until edges are themselves
   derivable/authoritative (E = project(typed composition)). Until then, runtime pass
   ordering stays authoritative.

**Decision framework (the requested distinction, made mechanical):** a portion's authority
should invert **only where** (i) the model portion is already **total / pure / derivable**
and (ii) inverting removes a real **drift or defect class** (make-error-impossible beats
catch-after-the-fact). By that test, config-selection is the first-payer, validation second,
pipeline-construction last (and Q5-gated). **Not now for any of them** — but the design keeps
each inversion *available* precisely because each is already a pure typed function keyed by
`NodeId`. So the honest long-term answer is **"descriptive now, with authority available
where it later pays,"** portion by portion — never a blanket "descriptive forever" beyond the
node-set projection.

---

## Summary

| # | Question | Verdict | Load-bearing receipt |
|---|----------|---------|----------------------|
| 1 | What does a node denote? | **SETTLED** — static pass KIND, not an invocation | `RemediationNode` no runtime fields `:261-288`; `NodeId` slug `:155`; INV-GRAPH-DECL-INERT `:1143-1172` |
| 2 | Granularity rule | **SETTLED** — node == registered pass; sub-pass governance = attribute cite | projection `:873-885`; `seam_cite` `:281-283`; provider keying `tolerance:176` |
| 3 | Data vs control deps | **SETTLED** — data only; control OUTSIDE; MUTATION is data-typed | `Edge` `:291-309`; `EdgeKind` `:217-229`; `phase_ref` pointer `:275-277` |
| 4 | Future execution graph | **PRESERVED-OPTION** — inert node + shipped per-run-divergence-by-node precedent | node inertness `:261-288`; `_NODE_METRIC` `tolerance:176`, `value_for` `:266` |
| 5 | Edge alignment as strong as node | **PRESERVED-OPTION (aspirational)** — coherent, gated on a typed-IO pass surface | `EDGES` hand-tuple `:708-721`; `contract_ref` SSOT `:305-307`; EDGE RATCHET `journey:234-237` |
| 6 | Authority direction | **PRESERVED-OPTION, per-portion** — node-set descriptive forever; config→validation→composition inversion available where it pays | INV-DECL-INERT `:1143-1172`; total pure `_KIND_TO_CONFIG` `:743-761` |

**Settled now: 3 of 6 (Q1–Q3). Preserved-option with code evidence: 3 of 6 (Q4–Q6).**
