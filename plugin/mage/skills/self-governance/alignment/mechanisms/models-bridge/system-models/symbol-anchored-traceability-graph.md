# Symbol-anchored traceability graph (derived edges)

**Intent** — Link every model to its lint, its code entry-point, its proof, its related models, and its
registry as a **typed graph whose every edge is a *derived* obligation a lint re-checks** — each edge
terminating on a resolvable *symbol*, never a line number — so when the code moves and breaks an edge,
the model↔code drift becomes mechanically visible at scan time. The governing principle: **derived edges
defend; snapshotted ones drift.**

| | |
|---|---|
| Summary | A typed model↔lint↔code↔proof↔registry graph whose edges are derived, symbol-anchored, re-checked. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a derived meta-lint re-resolves every edge's anchor and reddens on a broken one; runs at DoD/audit cadence because symbol resolution is costly. Lands audit-only, then promotes to blocking |
| Derivation | `both` — some fields generated to code, others reconciled from it |

*Its place in the environment — the **canonical mechanism** for **SYNC · Keep representations equal to reality**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-sync).*

## Motivation — the failure it kills

The [executable models](executable-source-of-truth.md) that let a context-bounded agent operate a
context-exceeding codebase are only useful while the map equals the territory. But a model states more
than facts about *itself*: it names the lint that enforces it, the code root it governs, the test that
verifies it, the registry it reconciles against. Those cross-references are the joins an agent walks to
jump between levels of abstraction — and they rot the moment the code moves without them.

The failure is **silent traceability rot**. A model's reference to a code symbol goes stale when the
symbol is deleted, renamed, or moved, and nothing notices — the model still *looks* authoritative while
pointing at a ghost. It recurs on every refactor that touches a referenced symbol: a deleted enforcement
routine, a checker that was made stricter without a matching edge to the producer it now rejects, a
"which implementation is live" pointer left aimed at a retired one. Each stale edge is a lie the fleet
reads as truth, and the blow-up lands days later in a downstream gate instead of at the change that
caused it.

The design was not guessed. The models were left deliberately **ungoverned** after creation and the
fleet allowed to drift them, so the mechanisms could be designed from real observed drift instead of a
hypothesis. An exhaustive audit of recently-closed work — each with a green definition-of-done at
close — harvested roughly two dozen drift instances at a signal-to-noise ratio near one and zero false
positives: a checker made stricter than the producer it now rejects, a subsystem retired from the code
but still present-tense in the model, a fully typed function wired to zero production consumers, a
reconciliation lint gone red the moment its Epic closed. That corpus is what "derived defends,
snapshotted drifts" was read *off of*, not asserted into — the clean cases all had a mechanism that read
the source of truth at check time; the drifted ones all had a parallel hand-maintained list that rotted.

## Why it's not just a drift gate, a manifest, or codegen

- **Not just a [drift & parity gate](drift-parity-gates.md).** A parity gate answers one question about
  one model: *does this model match reality?* — a model↔code equality check per model. This is a **graph**
  whose typed edges span five node genres at once — a model element, the lint that enforces it, the code
  root it governs, the proof that verifies it, the registry it reconciles against — with a closed
  vocabulary of edge kinds (governs / enforced-by / verified-by / derived-from / points-at) and a
  sanctioned kind-pair table. Parity keeps each model honest about *itself*; the graph keeps the *joins
  between* models, lints, code, and proofs honest, and it is **bidirectionally traversable** so an agent
  jumps code→model or model→code on the same index. A parity gate is one edge kind (the model↔code one);
  this generalizes the whole join web under one schema.
- **Not just a snapshot or manifest.** A committed adjacency file — a hand-maintained trace matrix, a
  frozen list of "model X is tested by Y" — is the exact anti-pattern the failure indicts: it drifts the
  instant the code moves, because nothing re-derives it. Here **every edge carries a derivation**: the
  mechanism that re-proves it by reading the code, the registry, or the doc at check time. An edge with
  no derivation is unrepresentable — the type that holds an edge makes its derivation non-optional. The
  graph is walked on demand from in-situ anchors, never stored as a snapshot that could go stale.
- **Not just codegen from a spec.** Model-to-code generation is *one-way*: the model is the source and
  the code is the output, so the model can't be authored *from* the code. This territory is code-first —
  the models are written from the code they describe — so generation inverts reality. The graph keeps
  bidirectional *traversal* (query either direction) without bidirectional *generation*: it is a typed
  *view over* the code's own symbols, not a generator that owns them.
- **Not just a systems-engineering trace model with a sync job bolted on.** The established
  systems-engineering notation for cross-level traceability answers "what *is* the system?": it is a
  stored model whose links connect model elements to *other model elements*, so its targets trivially
  exist and "drift from code" is not even a question it can ask. To make such a model live against code,
  you keep the stored snapshot and bolt on a **sync process** that re-aligns it — and a process can lag,
  can fail, is itself another governed thing. This inverts that: the code is the truth, and an edge is a
  **resolver over live code**, so reading it *is* reading the current territory. Liveness is a property
  of the representation, not a process kept running beside it — and a property cannot drift while a
  process can. The notation is borrowed (satisfy / verify / allocate / derive); the embodiment is
  changed, from a snapshot-plus-sync to resolution-is-the-read.

## Mechanism

- **Anchor to symbols, not lines.** Every edge terminates on a `SymbolAnchor` — a resolvable
  `(path, symbol, resolver)` reference to a function or class definition, carrying no line number. Line
  numbers churn under every edit above them (a batch of code entry-point references once went stale under
  a refactor); a symbol survives and is resolvable statically. The resolver is chosen by file extension —
  a language-aware static analyzer for code, a membership check for registry keys, a heading for docs — so
  an anchor cannot silently pick a weak textual prover for a code symbol. A textual-presence fallback is a
  *declared, visible* weak edge, never an accidental one.
- **Type the edges over a closed vocabulary.** A `TraceEdge` carries a `src`, a `dst`, an edge kind from
  a closed set (governs / enforced-by / verified-by / derived-from / points-at / related-to, adopted from
  the systems-engineering relationship vocabulary), and a non-optional derivation. A kind-pair table
  declares which node genres each edge kind may connect, so a mis-shaped edge is caught.
- **Re-derive every edge at check time — the derived-over-snapshot invariant.** A meta-lint walks the
  graph and, per edge, runs the edge's derivation against its target anchor and asserts it resolves. A
  vanished symbol reddens the edge — exactly what should fire when a referenced routine is deleted. It
  also asserts the kind-pair is sanctioned and that no code anchor rides the weak textual prover where a
  real one exists.
- **Run it at the cadence its cost earns.** Resolving a symbol across a large tree is expensive (a
  cross-reference round-trip per symbol), so the re-derivation lint runs at definition-of-done / audit
  cadence, not on every commit — the cadence follows the cost. It lands audit-only (a fresh graph has
  stale edges), a fix wave drains them, then it promotes to blocking.
- **Guard the anchors themselves — the pointer-drift mechanism.** One drift class needs its own guard: a
  *replacement* implementation is built but the surfaces that name **which one to run** are never
  repointed, so the system defaults to the retired one — a loaded gun that fires on the next routine
  command. A small registry declares, per seam, the one live implementation plus the full census of
  pointer surfaces (code routing, runbook, agent-context doc, operator skill, canonical-command example)
  that must name it; a derived lint asserts every surface agrees, and a cutover checklist criterion aims
  the change up front. This is a `points-at` edge whose derivation is registry agreement.

- **Walk the graph both ways — the context-prosthetic.** The same anchors that catch drift also make
  the graph a navigable cross-layer index. A systems engineer holds "the relevant parts and how they
  relate"; a context-bounded agent cannot hold a whole large codebase, and must not grep it (context
  blow-up) or guess (hallucination). The graph is that mental model, externalized: the agent traverses
  edges to pull just the relevant slice and its relations into context. The link is realized both as a
  model-side anchor and as a *derived* code-side back-reference trailer, so an agent at a symbol jumps up
  to the invariant it realizes and an agent at a model jumps down to the code — a query surface reads
  either direction on demand. Drift-detection and this traversal are two faces of one property: an
  anchor that resolves means both that the model's claim is currently true *and* that the agent's
  traversal is a current slice of the system. You do not get one without the other.

A sharp by-product: a model that wants to reference a symbol for which **no clean anchor exists** — the
logic is buried inline in a god-function — surfaces that absence as a finding. The missing anchor is an
**abstraction-completeness probe**: the model needs a seam the code hasn't factored out, so the
unresolved anchor routes to a refactoring target, not an error.

## Prerequisites

- **Static symbol resolvers already exist** — a language-aware analyzer per code language whose
  cross-reference the graph *composes*, rather than a new resolution engine. The graph is a typed view
  over resolvers that already ship.
- **Structured models with addressable elements** — the nodes the edges terminate on (model invariants, lints,
  code roots, tests, registry rows) are first-class, citable things.
- **A place for the edge to live in-situ** — the anchor rides *with* the code or model site (a typed
  reference field, a structured comment trailer) so it travels when the symbol moves, read by a derived
  lint rather than held in a central snapshot.
- **A criticality/cadence policy** — because re-derivation is costly, a declared rule for *when* it runs
  (audit / definition-of-done, not per-commit) so the cost lands where it earns its keep.

## Consequences & costs

- **Resolution is expensive, so the check is not per-commit.** A cross-reference per symbol over a large
  tree is slow; the re-derivation lint is a scan-time / definition-of-done mechanism, and a fast keyword
  companion catches the cheap cases inline. Force it per-commit and it taxes every change.
- **A weak-prover fallback is a standing ⚠️.** A code anchor that resolves only by textual presence is a
  declared weak edge the coverage view surfaces; left un-burned-down it re-admits the drift the strong
  prover exists to remove.
- **Resolution catches deletion, not demotion.** A symbol that still exists but no longer plays the role
  the edge claims resolves green. The keyword companion (present-tense role-currency) covers that gap; the
  two are complementary, and treating one as subsuming the other leaves a blind spot.
- **The edge vocabulary must fit the domain.** A relationship the closed kind set can't express forces an
  enum change — the honest signal that the join web grew a dimension, not a reason to smuggle in an
  untyped string edge.

## Known uses

- A traceability graph over the system models whose typed edges join each model element to its
  enforcing lint, its governed code root, its verifying test or formal proof, its related models, and its
  registry entry — every edge symbol-anchored and re-derived by a meta-lint that reddens on a broken
  anchor. Built from real drift: a fan-out over twelve models classified roughly six-hundred anchors and
  caught about fourteen genuine model↔code drifts — stale symbol cites, deleted-file registry keys, a
  prose cite the code had moved away from. The load-bearing result: for most of them **no existing lint
  fired**, so the graph was their first mechanical detection. That reprised the audit's near-one
  signal-to-noise and zero false positives on an independent, freshly-observed drift set — evidence that
  a mechanism designed from real drift catches real drift.
- The clean-versus-drifted split, on that same fan-out, re-confirming the governing principle: the
  models carrying a standing anchor-resolution lint drifted zero times; the drift concentrated in the
  registries with no such lint. Derived defended; snapshotted drifted.
- The two exemplars it generalizes: a per-model state-machine reconciliation lint whose symbol-presence
  references seeded the anchor type, and a coverage walk asserting every model element has a
  verified-by artifact.
- The active-implementation registry plus its pointer-agreement lint, seeded by a prod-blocking deploy
  incident where a built-but-unwired replacement left every pointer surface aimed at a deleted driver.
- **Proof-as-anchor** — the trajectory that folds formal methods into the graph. Where an invariant
  carries a model-check (a bounded-model-check or exhaustive state-space search, for the concurrency
  slice), the proof is *just another anchor kind*: a `verified-by` edge whose target is a checker run
  rather than a test. Two payoffs follow. The agent's traversal reaches the whole verification story —
  invariant, the code it governs, the proof that clinches it. And when anchored code changes, the graph
  can *trigger re-running the checker*: for that slice, re-verification is mechanized, where every other
  edge's semantic-currency check stays sample-judged by hand.

## Related mechanisms

- **Counterpart** — [drift & parity gates](drift-parity-gates.md): a per-model model↔reality equality
  check. This generalizes that one edge kind into a typed graph spanning model↔lint↔code↔proof↔registry,
  and turns "does the edge still hold?" from a hand-maintained matrix into a re-derived walk.
- **Enabler** — [executable source-of-truth](executable-source-of-truth.md): the structured models are the
  nodes this graph's edges terminate on; the graph is one more consumer of that substrate.
- **See also** — [coverage → model-node mapping](coverage-model-mapping.md): a sibling join over the same
  nodes. That maps *tests* onto model nodes to show which invariants are exercised; this maps *code,
  lints, and proofs* onto them and re-checks that the joins resolve. Both make the model a work-list of
  unresolved joins.
- **See also** — [control↔substrate dependency](control-substrate-dependency.md): the neighbouring
  self-application of the models to the fleet's own edges. That types each control's *substrate
  assumption* to compute a migration blast radius; this types each *trace edge* and re-derives it to
  catch a broken join. Both lift an invariant out of buried prose into a typed, queryable fact.
- **See also** — [meta-model consumption](meta-model-consumption.md): the read-don't-copy discipline the
  derived-over-snapshot invariant extends from a single value to a whole edge.
- **See also** — [query surface](query-surface.md): the read API a bidirectional trace query rides on, so
  an agent walks the graph up (code→model) or down (model→code) on demand.
