# Round 2 — granularity depth, the edge-DAG path, INV-DECL-INERT authority, and why-a-static-graph (260818)

*Answers to `more-questions-2.md`. These **deepen** round 1
(`more-questions-answers-260818.md`) — I build on those verdicts rather than
repeat them. Round-2 Q1/Q2/Q3 sharpen round-1 Q2/Q5/Q6; round-2 **Q4 is the new,
load-bearing one** — why a static graph and not the executable pipeline, what is
model-above-code vs code, and how alignment is machinery not discipline. Every
load-bearing claim carries a repository receipt (`file:line` / symbol) verified
against `main` @ HEAD on 260818. Facts re-verified this round: **113 nodes / 2
edges**, `node_parity_drift() == ()` (clean).*

Primary source under test: `system-models/remediation_graph.py` (1195 lines),
`system-models/remediation_graph_complexity_provider.py`,
`system-models/remediation_graph_tolerance_provider.py`,
`tools/lint/lint-remediation-graph-parity.py`, and the new Epic
`docs/epics/active/typed-stage-patch-composition-260818/main.md`.

---

## Q1. Is one-node-per-pass a permanent granularity rule, or the current projection? When does a sub-pass become its own node? — **The one-node-per-pass rule is the DERIVED PROJECTION, not an authored rule; sub-pass concerns attach as ATTRIBUTES with a finer cite; decomposition is warranted only when a sub-computation needs its own IDENTITY IN THE EDGE GRAPH.**

Round 1 settled that a node *is* a registered pass and that sub-pass governance
attaches as an attribute cite. The user's round-2 sharpening — *"if a pass contains
multiple independently consequential computations with different complexity /
determinism / cost / evidence, do those stay attributes or become sub-pass nodes,
and what is the rule?"* — has a precise answer, and the code already demonstrates it.

**One-node-per-pass is not a rule someone chose; it is what `V = project(registry)`
produces.** The node set is `read_live_pass_slugs()` over the C# `PdfPassRegistry`
(`remediation_graph.py:873-885`), slugified one-per-`new <Name>Pass()`. Granularity
is therefore **inherited from the architecture's own decomposition**, not declared by
the model. If tomorrow the architecture splits `PdfStructAltTextGenAiPass` into two
registered passes, the node set follows automatically (`node_parity_drift()` surfaces
the new slug as `MISSING_IN_MODEL`, `:887-912`). So the granularity is *permanent as
a mechanism* (always == the registry) but *not fixed as a number* (it moves with the
registry). This is the crucial reframe: **the rule is "project the registry," and
one-node-per-pass is its current output.**

**Sub-pass concerns attach as attributes at a FINER cite — the code proves a single
node already carries multiple independent inner-algorithm claims.** The complexity
provider does not key one annotation per node; it keys a **tuple**:

```python
# remediation_graph_complexity_provider.py:228-236
by_node: dict[rg.NodeId, tuple[ComplexityAnnotation, ...]] = {}
for a in annotations:
    by_node[a.node_ref] = by_node.get(a.node_ref, ()) + (a,)
...
def value_for(self, node_id) -> tuple[ComplexityAnnotation, ...]:
    """ALL hot-seam annotations owned by node_id ..."""
```

Each `ComplexityAnnotation` carries its **own** `file::symbol` `seam_cite`
(`:111-113`) plus its own `node_ref` back to the owning node (`:129-130`,
INV-CX-NODE-RESOLVES). So a pass with three independently-consequential hot inner
computations attaches **three** complexity annotations at **three** inner
`file::symbol` cites, all pointing at the *one* registry node — **no sub-node is
minted.** The `seam_cite` field on the node itself (`remediation_graph.py:281-283`)
is the same escape valve at the node level: *"the seam a code-anchored attribute
joins on."*

**Different concerns legitimately attach at different granularities — and that is
fine, because none of them defines the node.** Determinism attaches **whole-node**:
`_NODE_METRIC: dict[NodeId, StructuralDiffMetricId]`
(`remediation_graph_tolerance_provider.py:176`) is one metric per node — a pass's
run-to-run structural divergence is measured over the pass's whole output, there is
no finer cite. Complexity attaches at **inner symbol** (the tuple above). These two
concerns disagree about *where to point* but **not about what a node is**, precisely
because the node is defined by the registry, not by either concern. Round 1's worry —
"node decomposition must not be decided accidentally by whichever governance concern
exposed a seam first" — is structurally impossible here: a governance concern **cannot
mint a node** (it has no write path into the projected set); it can only attach an
attribute keyed by an existing `NodeId`.

**The decomposition rule, made sharp.** A sub-computation becomes its own node **IFF —
and only IFF — it needs its own IDENTITY IN THE DEPENDENCY GRAPH**, i.e. one of:

1. **It is an independent producer/consumer** — some *other* pass reads its output
   directly (not the enclosing pass's output), so it needs to be an edge endpoint. A
   node is a *place in the data-flow DAG*; if a sub-computation is not independently an
   edge endpoint, it has no reason to be a vertex.
2. **It carries an attribute inexpressible as a cite** — a governance fact that cannot
   be attached via `seam_cite` + a provider keyed by the enclosing node (in practice,
   rare — the tuple-per-node complexity provider shows most "finer" facts *are*
   cite-expressible).

Otherwise it stays implementation-beneath-a-node, governed by an attribute at a finer
cite. Restating the user's proposed rule with the operative word made mechanical:

> **A node is the smallest INDEPENDENTLY GOVERNABLE stage — where "governable" means
> "needs its own node IDENTITY for edges or an un-citable attribute," NOT merely "has a
> distinct property."** A distinct property (a different Big-O, a different determinism
> budget) is a **cite**; a distinct place in the dependency graph (an independent
> producer/consumer) is a **node**. The registry is the arbiter of which; a governance
> concern never is.

This is why one-node-per-pass is stable *without* being arbitrary: passes are exactly
the stages the architecture chose to make independent edge endpoints, so "project the
registry" and "smallest independently-governable stage" coincide **by construction**.

---

## Q2. Path from the 2-edge seed to a real DAG — can edge alignment become as strong as node alignment? — **Yes; the ratified route is (b) typed-IO projection, EXTENDED to typed PATCHES onto the IR — now its own founding Epic, `typed-stage-patch-composition-260818`.**

Round 1 established the asymmetry as PRESERVED-OPTION. Round 2 asks for the *path* and
whether edge alignment can become mechanically strong "in the way node alignment already
is." It can, and the route is now ratified and scoped as a separate Epic.

**Today, verified.** Nodes satisfy `V = project(PdfPassRegistry)` — self-maintaining,
cannot be hand-copied wrong (`read_live_pass_slugs` `:873-885`; BLOCKING parity lint,
`lint-remediation-graph-parity.py:41`, `:86-89`, `:149`). **Edges have no
`EdgeRegistry`**: `EDGES` is a hand-declared tuple of exactly **2** edges
(`remediation_graph.py:708-721`) — one resolving `CROSS_SERVICE` contract + one
published `contract_ref=None` ⚠️ gap. So edge alignment is ratchet/runtime-based, not
generative — the "honestly-weak facet" (field note §4, EDGE RATCHET).

**The four candidate routes to a complete DAG:**

- **(a) Manual + ratcheted** — author each edge by hand, gate against regression. Honest
  but drift-prone; the edge set never becomes self-maintaining. *Rejected as the endgame*
  (it is what we have, minimally hardened).
- **(b) PROJECTED from typed pass composition** — passes statically declare input/output
  types (a `Pass<TIn,TOut>` surface), so "which pass's output type feeds which pass's
  input type" is derivable by *reading types*, exactly as `read_live_pass_slugs` derives
  the node set by reading `new <Name>Pass()`. **The principled endgame** — but it needs a
  typed IO surface the passes do not expose today (they register as bare
  `new <Name>Pass()` with no static IO type pair).
- **(c) INFERRED from instrumentation** — a runtime execution graph observes actual
  data-flow and reports the edges empirically. Powerful (it sees edges the types miss),
  but descriptive/observational, not compiler-enforced; a good *cross-check*, not the
  authority.
- **(d) A combination** — (b) as the enforced spine + (c) as an empirical audit that the
  projected edges match observed data-flow.

**The ratified recommendation (route b, EXTENDED).** Rather than only *typing* pass IO
so edges *project*, make stage **OUTPUTS themselves typed PATCHES onto the IR / document
object** (rather than direct in-place edits). Then two things fall out at once: (a) edges
project from typed producer/consumer composition — `E = project(typed IO)` — closing the
weak edge facet; and (b) **the compiler enforces stage composition** — a malformed patch
is unrepresentable, and ordering / rollback / provenance come "for free" from the patch
algebra. This extends the typed-sole-mutator direction (#15/#16) one level up: from typed
*mutations* to typed *outputs*. `Edge.contract_ref` already points at the
`wire-contracts/*.schema.json` SSOT (`:305-307`), so projected edges would reuse the
existing contract identifiers — **no new edge-schema format.**

**This is now its own founding Epic — I reference it, I do not re-design it here.**
`docs/epics/active/typed-stage-patch-composition-260818/main.md` (founding stub,
Phase-1 Opus design in progress) owns the pricing: it must *honestly price the
migration* and propose an **incremental** path (pilot on one pass family first, not a
big-bang), with a negative result explicitly acceptable. The remediation-graph substrate
is the *consumer* of that Epic's outcome — if typed-patch composition lands, the graph's
edges become projected; if it prices out as not-worth-it, the edge set stays ratcheted
and the graph's edge facet remains honestly-weak. **The answer to "can edge alignment
become as strong as node alignment?" is: yes, via `E = project(typed patches)`, and the
cost/worth question is exactly what the new Epic's Phase-1 exists to answer.**

---

## Q3. Is INV-GRAPH-DECL-INERT permanent, or the model's present authority level? Could parts become authoritative? — **It is the PRESENT authority level, not a permanent architectural invariant — and the answer is PER-PORTION.**

Round 1 answered "authority direction" as preserved-option, per-portion. Round 2 asks
specifically whether INV-DECL-INERT is *permanent* or *present-tense*. It is
**present-tense**, and deliberately so — but the permanence differs by portion.

**What INV-DECL-INERT actually asserts (verified).** `runtime_path_references()`
(`:1151-1172`) is a probe that **no production runtime `*.py` imports the model**
(`MODULE_IMPORT_TOKEN = "remediation_graph"`, `:1148`); the C# runtime cannot import a
`system-models` module at all, so this covers the only reachable runtime language. The
invariant is: *the declarations are never on the runtime path.* It is a statement about
**where the model is read**, not a claim that it may never be read.

**Why inert-now is a SAFETY choice, not a limitation.** Because the model is lint-time
metadata, a bug in it — a mis-declared Big-O, a stale cite, a wrong config color — can
**crash a lint, never crash prod.** Making a portion authoritative means the runtime now
*depends on* that portion being correct: the blast radius of a metadata bug moves from
"a red lint" to "a wrong remediation." So authority is inverted **only where it pays**,
portion by portion, ordered by first-payer:

- **DESCRIPTIVE FOREVER — the node-set projection.** Inverting "which passes exist" would
  duplicate `PdfPassRegistry` and re-introduce the exact drift the projection kills
  (`read_live_pass_slugs` `:873-885`). This portion is permanently territory→model.
- **FIRST-PAYER for inversion — config selection.** `derive_config_kind` /
  `_KIND_TO_CONFIG` (`:743-761`) is a **TOTAL, type-exclusive, pure** map
  `NodeKind → GenAiConfigKind`. Today it is a lint-time assertion
  (INV-GRAPH-CONFIG-EXCLUSIVE). Its purity is the enabler: the runtime could **read** the
  node's kind→config selection at pass-construction time, so a structural node **cannot be
  handed a creative config by construction** (make-error-impossible, A.8/A.22) — strictly
  better than a lint catching it after the fact. **This is the concrete "selected part
  becomes authoritative" the user asked about: `_KIND_TO_CONFIG` could GENERATE
  config-selection.**
- **SECOND — validation requirements** (the tolerance budget becomes the runtime variance
  gate rather than an offline measurement).
- **LAST — pipeline composition**, gated on Q2 (the graph cannot drive pipeline
  construction until edges are themselves derivable/authoritative).

**The decision test, made mechanical:** invert a portion's authority **only where**
(i) the portion is already **total / pure / derivable** and (ii) inverting removes a real
**drift or defect class**. By that test the architecture is **not** "permanently
runtime-as-territory": it is "runtime-as-territory now, with each pure typed
`NodeId`-keyed function *available* to become authoritative the moment inverting it pays."
The permanence is real only for the node-set projection; everything else is present-tense.

---

## Q4. Why a static graph and not the executable pipeline? What is model-above-code vs code? How is alignment ensured? — **Essence-vs-accident (A.20): the pipeline IS code and should stay code; the model asserts the cross-cutting properties that are ABOUT the code, not OF it; alignment is machinery (projection + reference-resolution + measured scorecard), not discipline.**

This is the load-bearing question. It has three parts.

### (a) Why static, not executable — because making it executable is the WRONG trade

**The pipeline already is code — good code.** The execution order is the C#
`PdfPassRegistry` (a sequence of `new <Name>Pass()` instantiations); each pass is a
compiler-checked C# class doing format-specific work (iText tree surgery, OpenXML
mutation, GenAI calls). The data-flow, the ordering, the conditional/retry/fan-out logic
live in that C# and in `web/chunking/`. Making the *graph* executable would mean
**replacing typed C# orchestration with a graph-interpreter** that walks nodes and edges
and dispatches passes. That is precisely the A.20 anti-pattern: it does not *remove*
essential complexity, it *relocates* it — from a compiler-checked C# call sequence (where
a type error is caught at build) into a dynamically-interpreted graph (where a
composition error is caught, at best, at runtime). Brooks' test — *"is this reducing
accidental complexity, or relocating essential complexity behind a prettier name?"* —
fails: the pipeline's essential complexity (four formats, each with its own tag model and
conformance spec) is genuinely hard, and a graph interpreter would hide it behind a
prettier name while *losing* the compiler.

So the graph is static **because the executable pipeline is not accidental complexity to
be abstracted away — it is essential complexity that C# already expresses well.** The
model's job is not to *become* the pipeline; it is to *reason about* the pipeline.

### (b) What is model-above-code vs code — the "ABOUT it, not OF it" line

The clean division:

- **In CODE (essential, format-specific, executed) — compiler-checked C#/Python.** The
  actual remediation logic: how `PdfStructAltTextGenAiPass` walks the struct tree, how a
  region gets an alt-text, the execution order, the fan-out/fan-in, the retries. This is
  the *territory*. It runs. A type error here is a build error.
- **ABOVE code (the MODEL) — cross-cutting properties reasoned about ACROSS passes.**
  Determinism tolerance, Big-O / N-driver, cost, taxonomy color (`NodeKind`), the
  data-flow contract of an edge. These are properties **ABOUT the code, not part OF it.**
  The decisive tell: **a pass does not know its own Big-O.** `PdfStructTreeReader` does not
  contain a statement "I am `O(P²)`"; that is a claim *about* its runtime behavior that a
  human/agent asserts (`ComplexityAnnotation.declared`,
  `complexity_provider.py:114-115`) and a scaling probe *pins*
  (`scale_probe`, `:132-133`). Likewise a structural GenAI pass does not know it is
  "supposed to be reproducible within ε=0.05" — the model asserts that budget and the
  tolerance scorecard measures whether reality complies.

**Why these belong above code, not IN it.** A cross-cutting property is exactly one you
cannot read off any single file — it is a *relationship* (this pass's output feeds that
pass's input; these 37 nodes share a determinism budget; these three inner seams are all
`O(P²)`). Encoding "I am O(P²)" as a code comment in one file makes it invisible to the
query "which seams on a hot path are quadratic?" — the very question that started this
whole effort (field note §1). The model exists so cross-cutting properties have a
**queryable home** and can be **asserted + pinned** as first-class facts, rather than
re-derived by every future agent reading code. That is the "not suitable for making
explicitly code" answer: it is not that these properties *can't* be written in code —
it is that they are *about* the code, span many files, and would be *lost as a queryable
whole* if scattered into per-file comments.

### (c) How alignment is ensured — machinery, not discipline

The risk of any model-above-code is that it drifts from the code it describes and becomes
prose that lies. This model is **forced equal to the territory by lints**, on three
independent mechanisms (field note §4):

1. **PROJECTION (generative, STRONG)** — the node SET is *computed from* the live
   `PdfPassRegistry` (`read_live_pass_slugs` `:873-885`), and a **BLOCKING** parity lint
   fails if the declared set ≠ the live set (`lint-remediation-graph-parity.py:41`,
   `:86-89`, `:149`). The map is not *checked against* the territory; the node set *is* a
   projection *of* the territory. It cannot be hand-copied wrong. (`node_parity_drift()`
   verified `()` at HEAD.)
2. **REFERENCE-RESOLUTION (deterministic, STRONG)** — every pointer must resolve to
   something real: `phase_ref` to a live `PhaseId`, `genai_tasks` to live `GenAiTask`
   keys, `seam_cite`/`node_ref` to a real `file::symbol`, `contract_ref` to a real
   wire-contract stem, provider coverage to a real node. A cite that no longer resolves is
   a finding. The map's *pointers* are held equal to the territory's *symbols*.
3. **TOLERANCE / VALUE SCORECARD (measured, MEDIUM)** — a declared *value* (a Big-O bound,
   a determinism ε, a cost) can resolve correctly and still be *false* (stale vs measured
   reality). The scaling probes (`scale_probe`, pre/post negative-control validated,
   field note §1) and the K-run tolerance scorecard
   (`remediation_graph_tolerance_provider.py`) **measure actual runtime** and compare to
   the declared value. The map's *values* are held equal to the territory's *behavior*.

**This is why the model can be INERT and still trustworthy.** Inert means "never on the
runtime path" (Q3). Trustworthy means "equal to the territory." Those are independent:
the model earns trust not by *running* (an executable model that drifts is just as wrong,
and now crashes prod), but by being **mechanically forced equal to the code** by
projection + reference-resolution + measurement. Alignment is a property of the *lints*,
not of the *authors' discipline* — which is exactly why a context-bounded agent can trust
the map without re-reading the whole territory. The static graph is the *map that the
lints keep equal to the territory*; the executable pipeline is the *territory itself*,
best left as the compiler-checked C# it already is.

---

## Summary

| # | Round-2 question | Verdict | Load-bearing receipt |
|---|---|---|---|
| 1 | Granularity: rule or projection? | **PROJECTION-derived**; sub-pass = attribute at a finer cite; decompose only for own edge-graph IDENTITY | tuple-per-node complexity `complexity_provider.py:228-236`; whole-node determinism `tolerance:176`; `seam_cite` `:281-283`; parity `:873-885`,`:899` |
| 2 | Path to a real DAG; edge alignment as strong as nodes? | **Yes — route (b) typed-IO EXTENDED to typed PATCHES**; own Epic prices it | `EDGES` 2-tuple `:708-721`; `contract_ref` SSOT `:305-307`; Epic `typed-stage-patch-composition-260818/main.md` |
| 3 | INV-DECL-INERT permanent or present authority? | **PRESENT, per-portion**; node-set descriptive forever; `_KIND_TO_CONFIG` first-payer to generate config-selection | `runtime_path_references` `:1151-1172`; total-pure `_KIND_TO_CONFIG` `:743-761` |
| 4 | Why static not executable; model-above-code vs code; alignment? | **Essence-vs-accident**; pipeline stays compiler-checked C#; model asserts cross-cutting properties ABOUT the code; alignment = projection + reference-resolution + measured scorecard (machinery) | A.20; a pass doesn't know its own Big-O (`complexity_provider.py:114-115`,`:132-133`); BLOCKING parity lint `:41`,`:149`; INV-DECL-INERT `:1151-1172` |

**Q1/Q2/Q3 deepen round-1 verdicts with the operative mechanism made mechanical; Q4 is the
new architectural answer: the graph is static because the executable pipeline is essential
complexity C# already expresses well, and the model earns trust by being lint-forced equal
to that code — not by running it.**
