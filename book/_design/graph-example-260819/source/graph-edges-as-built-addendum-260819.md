# Graph Edges — As-Built Addendum (260819)

*This addendum PRESERVES the prior files in this directory
(`more-questions-answers-260818.md`, `more-questions-2-answers-260818.md`,
`new-model-answers-260818.md`, and the field-note copy). It does not revise
them. It re-answers the edge / granularity / authority questions now that the
edge work is no longer a **design** — it is **built, landed, and the Epic is
CLOSED** (`typed-stage-patch-composition-260818` → `docs/epics/closed/`).*

*Where an earlier answer was a prediction or a proposed design, it now has an
**as-built** status tag: **CONFIRMED** (built as answered), **REFINED** (built,
with a correction the implementation forced), or **NOW-FACT** (was "not yet,
but the design preserves it" — the option has now been exercised).*

---

## 0. The headline: 2 → 33 edges, and they are projected, not authored

Your originating observation was *"113 nodes and only 2 edges? That is
strange."* It was the right thing to be bothered by. The 2 edges were
**hand-authored** — the graph had no mechanical edge structure at all; it had
two links someone typed.

That is now gone. **Edges are projected from the passes' typed IO.** No edge is
authored by hand. The live numbers, read from the code at the time of writing
(`system-models/remediation_graph.py`, `import remediation_graph; len(EDGES)`):

| Quantity | Value | What it is |
|---|---|---|
| **Nodes** | **113** | the remediation-graph node registry (unchanged) |
| **Edges** | **33** | **projected**, up from 2 hand-authored |
| — `DATA_FLOW` | **10** | a pass produces a facet another consumes *to make its output* |
| — `CONTROL_GATE` | **22** | a pass reads a facet only to decide *whether to run* |
| — `CROSS_SERVICE` | **1** | the one data edge that crosses a service boundary |
| **Payload-bearing** | **11** | `DATA_FLOW` (10) + `CROSS_SERVICE` (1); gates excluded |

The mechanism: each PDF pass declares typed facet sets over `PdfPassFacet` (the
15 settable `PdfPassSharedValues` properties) — `Produces`, `Consumes`, and
`ConsumesForControl`. The projector `project_edges()` folds
`Produces × Consumes → DATA_FLOW` and `Produces × ConsumesForControl →
CONTROL_GATE`. Change a pass's declared IO and the edge set changes with it;
a `BLOCKING` lint (`edge_projection_drift`, via
`lint-remediation-graph-parity`, currently **GREEN / 0 findings**) fails if the
projection and the declarations ever disagree. The graph *cannot* silently drift
from the code.

---

## 1. Re-answering `more-questions.md`

### Q3 — data vs. control dependency  → **REFINED (this is the big one)**

Your earlier stance, which I ratified: *"data flow should remain clean, and
control flow, if we ever model it, should be an explicitly separate relation
rather than gradually leaking into `Edge`."*

The full-IO sweep initially projected **33 edges of a single kind** — and ~22 of
them were exactly the leak you warned about: passes reading `DocumentSignals` /
`RegimeVerdict` / `TextFidelityDivergentPages` **only inside `ShouldRun` /
`IsRouted`** to decide whether to execute. Those are control dependencies wearing
a data-edge costume. Left as-is, the "clean data DAG" would have been ~⅔ gate
noise.

So the split was built, applying your Q3 ruling literally:

- A third facet, **`ConsumesForControl`**, distinct from `Consumes`. A pass that
  reads a signal *only* to gate itself declares it there; a pass that reads a
  signal *into its remediation output* keeps `Consumes`. A pass that does both
  declares both (and gets both an edge in each relation — the data edge is never
  dropped).
- A distinct **`EdgeKind.CONTROL_GATE`**, folded from `Produces ×
  ConsumesForControl`.
- **`is_payload_bearing()` excludes `CONTROL_GATE`**, so the Phase-6
  serialize-and-check — the validator that confirms an edge's payload actually
  round-trips — runs over the **11 payload-bearing edges only**. A boolean gate
  has no payload to serialize; asking it to would be a category error.

Result: `DATA_FLOW` is the clean **10-edge** relation you wanted; control lives
in a **separate, explicitly-named 22-edge relation** that shares the projector
but not the payload semantics. Control did not leak into `Edge`; it got its own
`EdgeKind` and its own exclusion from the data-path check.

On the sub-question — *"does `MUTATION` carry control semantics?"* — no. Mutation
is captured on the **node** now (the mutation-kind, below), not on the edge. The
edge relation stays a pure producer→consumer composition; ret/fallback/fan-out
remain **deliberately outside** this graph (they belong to a future *execution*
graph — see Q4, still NOW-FACT-preserved-but-not-built).

### Q5 — `E = project(typed composition)`  → **NOW-FACT**

Your exact framing: *"could we eventually have both `V = project(task
registries)` and `E = project(typed composition)` rather than maintaining the
edge set manually?"* At the time the answer was "that is the target; edges are
the deliberately-ratcheted weak facet for now."

It is no longer the target; it is the **as-built**. `E = project_edges(typed
pass IO)` is exactly what runs. Edge alignment is now as mechanically strong as
node alignment — both are projections, both parity-checked by the same
`BLOCKING` lint. The "edges are the weak facet" caveat from the 260818 answers is
**retired**.

### Q6 — authority (`INV-GRAPH-DECL-INERT`)  → **CONFIRMED (unchanged, deliberately)**

Still descriptive: runtime is authoritative, the graph is lint-time metadata,
authority flows territory→model. Building edge-projection did **not** invert
this — note the direction. The passes' C# declarations are the territory; the
Python graph *reads* them and projects. We strengthened the *fidelity* of the
map to the territory (edges now derived, not guessed) without moving any
authority to the map. That is the distinction you asked us to keep: "descriptive
now, with authority available where it later pays" — we made it *more faithfully*
descriptive, and left the authority question exactly where it was.

---

## 2. Re-answering `more-questions-2.md`

### Q1 — one node per pass: permanent rule, or current projection?  → **REFINED**

The node granularity rule holds — one node per registered pass — but the work
added a **typed sub-pass classification** that answers the tension you raised
("a pass may contain multiple independently-consequential computations with
different properties"). Every pass now declares a **mutation-kind**, live counts:

| Mutation-kind | Count | Meaning |
|---|---|---|
| `TypedPatchProducer` | **15** | well-scoped, typed change — the output is a *typed patch* onto the IR |
| `DirectEditor` | **40** | unbounded / direct mutation — *not* reducible to a typed patch (yet) |
| `ReadOnly` | **13** | no mutation (analysis / detection / validation) |

This is the concrete form of your own instruction from the edges session: *"typed
patch outputs if there are at least 3 nodes that have well-scoped changes — the
stable ones we use; the unbounded ones we mark as direct editors — which lets us
KNOW instead of wave our hands."* There are **15**, not 3, well-scoped ones. They
are marked `TypedPatchProducer`; the 40 unbounded ones are marked `DirectEditor`
**honestly**, not typed-by-wishful-thinking. So the pass stays one node, but the
node now carries a typed answer to "how well-bounded is what this does?" — the
decomposition is no longer accidental-by-whichever-seam-came-first; it is a
declared, `BLOCKING`-enforced attribute.

### Q2 — the path from the 2-edge seed to a real DAG  → **NOW-FACT (answered by doing)**

You listed four candidate routes (manual+ratchet / projected from typed
composition / inferred from instrumentation / combination) and asked if there
was "a plausible route to making edge alignment mechanically strong the way node
alignment already is."

Answered empirically: the route taken was **projected from typed composition**,
and it reached a substantially-complete DAG (33 edges, two relations) in the
span of one Epic. Not manual-and-ratcheted (that was the interim); not
inferred-from-instrumentation (that would be the *execution* graph, still not
built). The typed-composition route was the strong one, and it is now the live
one.

### Q3 / Q4 — `INV-GRAPH-DECL-INERT` permanent? why static, not the executable pipeline?  → **CONFIRMED**

Unchanged by this work, and worth restating precisely because we just made the
map much more faithful: the graph is **still not** the pipeline. The C# passes +
their registry remain the executable territory; the graph is a projected,
audited *view* of them. We deliberately did not turn the projected edge set into
a pipeline builder — that would move authority model→runtime, which nothing has
yet justified. The value delivered is the one you named: the graph makes certain
questions *cheap to answer correctly* (below), not that it *runs* anything.

---

## 3. Re-answering the two edge-specific `new-model.md` prompts

### #9 — Typed edge contracts  → **NOW-FACT**

The section can now be written in the present tense. A typed edge contract is a
`(producer, consumer, facet)` triple where `facet ∈ PdfPassFacet`; the contract
is *proven* by the payload round-trip check on the 11 payload-bearing edges, and
its *existence* is proven by the projection-drift lint. The earlier answer
described this as the design intent; it is now the shipped mechanism.

### #15 — Current implementation status  → **UPDATE**

Supersede the 260818 status line for the edge facet:

> **Edges: BUILT.** 33 projected edges across two relations (`DATA_FLOW` 10 +
> `CONTROL_GATE` 22 + `CROSS_SERVICE` 1), derived from `Produces / Consumes /
> ConsumesForControl` facet declarations on `IPdfPass`, parity-enforced by a
> `BLOCKING` lint (green). Mutation-kind declared on all 68 pass sites
> (15 `TypedPatchProducer` / 40 `DirectEditor` / 13 `ReadOnly`). Epic
> `typed-stage-patch-composition-260818` **CLOSED**. O365 edge parity is
> `AUDIT-ONLY` (node parity is enforced; edge projection for O365 is not yet
> built — the one remaining asymmetry).

---

## 4. What the graph makes newly cheap (now that edges are real)

The edge structure was the missing piece for a class of questions that were
previously un-answerable-without-reading-all-the-code:

- *"If pass X's output changes, who is affected?"* → the `DATA_FLOW`
  out-neighbourhood of X.
- *"Which passes only gate on a signal vs. consume it into output?"* →
  `CONTROL_GATE` vs `DATA_FLOW` in-edges — a distinction that did not exist
  before the split.
- *"Which stages have well-bounded, typed effects vs. unbounded edits?"* →
  `TypedPatchProducer` (15) vs `DirectEditor` (40), directly.
- *"Can the pipeline order violate a data dependency?"* → checkable against the
  projected DAG, not by manual inspection.

---

## 5. Honest residual (what is NOT done)

Preserving the discipline of the prior answers — the negatives are wins to state
plainly:

1. **40 `DirectEditor` passes are still unbounded.** They are *marked* as such
   (which is the KNOW), but their effects are not yet expressible as typed
   patches. The `Run(): void → Run(): Patch` rewrite that would shrink this set
   is **PARKED** — deliberately not attempted in this Epic.
2. **O365 edges are not projected.** Node parity is enforced for
   PPTX/DOCX/XLSX; edge projection is PDF-only. The O365 parity lint is
   `AUDIT-ONLY`. This is the one place node-alignment is still stronger than
   edge-alignment — the mirror image of the gap you originally flagged, now
   isolated to the non-PDF formats.
3. **No execution graph.** Everything here is the *static* computation graph.
   Runtime facts (invocation, digest, duration, cost, model fingerprint,
   measured divergence, retries) still have no home in the model — by design
   (Q4 of `more-questions.md`), and the static model was built so a future
   execution graph can refer back to `NodeId` without forcing runtime state into
   `RemediationNode`. Still NOW-FACT-preserved, still not built.

---

## 6. Record/replay — a distinct execution layer (modeling vs execution)

Everything above (and in the field note §1–§9) is the **static computation
model** — inert, never on the runtime path. There is a *second, orthogonal*
substrate that runs over an **actual** remediation, and it is worth naming as a
distinct thing because it is about **execution, not modeling**: the
**record/replay** write-side layer.

**What it is.** Every typed mutation a pass makes during a real session is
recorded as a `PdfEdit` (a ~30-subtype typed edit algebra) into a per-session
`EditLog`; `EditReplayEngine` re-applies a `PdfEdit` list against an open document
in dependency-phase order; `EditorEditRunner` is the headless applier; the
`test/samples/l3-replay-golden` fixtures are recorded sessions replayed as golden
masters. Per-session, discarded on session end.

**Does it interact with the graph?**

- **In code: no.** They do not reference each other. Watch the false friend:
  `PdfEdit.NodeId` is a `StructId` — a PDF struct-*element* identity — **not** the
  graph's node.
- **Conceptually: they are the two halves of the static/execution split** that
  `more-questions.md` **Q4** anticipated. The **graph** models WHAT CAN happen
  (passes + typed-IO); the **EditLog** captures WHAT DID happen (the actual
  `PdfEdit` stream, in order, on a real doc) — a partial **execution-graph
  instance**. They meet at the **mutation-kind**: a `TypedPatchProducer` node's
  runtime output IS a subsequence of `PdfEdit` records. Wiring an EditLog
  subsequence back to its producing graph `NodeId` would make the log a true
  execution-graph instance of the static model — exactly Q4's "not now, but the
  design preserves it." **That linkage is a design option, not built.**

**Why it's relevant to the GT-test Epic** (`gt-anchored-node-tests-260819`, whose
Opus Phase-1 is now in flight): record/replay is a **deterministic test harness**
— a recorded GenAI session replays with *zero* model variance, letting us separate
"GenAI-call variance" from "deterministic edit-application" and pin the
deterministic half against ground truth cheaply. Together with the Typed-IO edges
(which locate each test's *starting point*), it is how each per-node GT test is
anchored. Modeling and execution stay distinct layers; the GT-test design is the
one place they are deliberately brought into contact.

---

*Ground truth for every number above: `system-models/remediation_graph.py`
(`EDGES`, `is_payload_bearing`, `project_edges`), the `MutationKind`
declarations under `backend/src/AdaTool.Cli/Pdfs/`, and
`lint-remediation-graph-parity` (green). Read at 260819. The canonical field
note is `docs/field-notes/remediation-graph-substrate-journey-260818.md`, to
which this addendum's §0 result is appended.*
