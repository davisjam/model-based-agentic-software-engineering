# The book as a typed 4+1 model — design

**Dogfooding "everything is a model."** Part 3 of the book preaches that a system is best understood
through Kruchten's 4+1 views, each a **typed, drift-checked model the fleet reasons through, derived from
the source and never snapshotted**. This directory turns that lens on the book itself: it models the book
as a small set of typed view-models that reference symbols *inside* the markdown, each held equal to the
prose by a build-time drift check.

The move is the same one Part 3 teaches applied one level up. There, the models are derived from the
*product* code. Here, the models are derived from the *book* — the `book_ir` typed IR is our "code," and
each view is a `model-from-code` projection over it, reconciled on every build.

This doc names the full view set, specifies the markdown symbol scheme each view rides, and states the
drift check that keeps each honest. One view — the **outline view** — is implemented here as a working
proof of concept; the rest are specified for the author to ratify before the full build.

---

## 1. Why model the book at all — the failure it kills

A book of this size has the same failure MBSE was invented for: **structure that lives in the author's
head and drifts silently.** Concrete failures the models catch:

- **A cross-reference goes stale.** A `[ref:key]` or `[text](chapter.html)` points at a section that was
  renamed or retired; the link still renders, but lands nowhere useful. Nothing re-checks it against the
  current heading tree.
- **A reading path breaks.** The preface promises three routes through the book ("read straight through,"
  "do it Monday," "be convinced first"), each naming specific parts in order. A part gets renumbered and
  the promised route now mis-describes the book. No model ties the promise to the parts.
- **A concept loses its home.** The concept model (`book/data/concepts.json`) already catches this for the
  *conceptual* surface — but it has no sibling for the *structural* surface (the heading tree) or the
  *navigational* surface (the journeys).
- **A section loses its point.** A subsection's topic sentence — the one-sentence claim the section
  argues — is the unit an outline is built from. When a section is edited so its opening no longer states
  its point, an outline built by hand rots; an outline *derived* from the prose surfaces the gap.

Each failure is invisible from any single chapter. It shows only when you hold the whole structure at
once — which is exactly what a typed model is for.

The precedent is already in the repo: `book/data/concepts.json` is a typed model of the book's core
concepts, joined book↔site by slug, with `book_home` **derived** at check time from the `<!-- index-def:
slug -->` anchors (never stored, so it cannot drift) and four drift lints (L1–L4 in `tests/html.py`). The
view-models here extend that exact pattern to the book's structure and navigation.

---

## 2. The view set

The author named three views to start and invited more. Recommended set: **the three named views plus
two more** (a cross-reference graph and a principle-weave model), for five total. Each is a typed model that
answers one quality question, built from named md symbols, held true by a drift check.

| # | View | Kruchten analogue | Quality question it answers | Status |
|---|------|-------------------|-----------------------------|--------|
| 1 | **Outline** | Development (how the source is organized) | *Is every section's structure and point accounted for — heading tree complete, each with a topic sentence?* | **PoC built here** |
| 2 | **Conceptual** | Logical (what the system is) | *Does every concept have a definition and a home, and do the chapter links and floats connect the concepts they claim to?* | Specified (partly exists as `concepts.json`) |
| 3 | **User-journeys** | Scenarios (+1, the paths that validate the rest) | *Does each promised reading path still traverse real parts in the promised order?* | Specified |
| 4 | **Cross-reference graph** | Process (what connects to what) | *Does every `[ref:]` / inter-chapter link / float reference resolve, and is the reference graph acyclic-where-it-should-be?* | Specified (recommended) |
| 5 | **Principle-weave** | (a book-specific invariant view) | *Are the two principles (Modeling, Alignment) actually woven through the parts that claim to develop them?* | Specified (recommended) |
| 6 | **Learning outcomes** | (a book-specific pedagogical view) | *Does every teaching unit declare what a reader can DO after it, does that outcome map to a real unit, and does the Part→chapter→section outcome tree decompose without gaps?* | **PoC built here** |

Below, each view gets its quality question, typed schema, and the md symbols it references.

### 2.1 Outline view (built)

- **Quality question.** Is the book's heading tree complete and coherent — every section down to
  sub-subsection level accounted for, in the right nesting order, each carrying a **topic sentence** that
  states its point?
- **Typed schema.**
  ```
  Outline
   └─ OutlineChapter(slug, part, title, sections[])
       └─ Section(id, level, heading_text, topic_sentence, id_source)
  ```
  - `id` — a **stable section id**: the explicit `{#slug}` anchor when present, else a slug derived from
    the heading text. `id_source` records which (`explicit` | `derived`) so the model shows how many
    sections still want a curated anchor.
  - `topic_sentence` — the first sentence of the first paragraph block that follows the heading (derived,
    not annotated — see §3).
  - `level` — 2–4 (H1 is the chapter title, rendered separately by the build).
- **Md symbols referenced.** `{#slug}` heading anchors (existing, 22 sites) for stable ids; heading text +
  the following paragraph (structural, no new symbol) for the topic sentence.
- **Invariants (checked by the drift check).**
  - *O1 — every heading is in the model.* The model's section set re-derived from the book equals the
    stored set. (`model-from-code` reconcile; a heading added/removed/renumbered without regenerating the
    model is a finding.)
  - *O2 — every section has a topic sentence.* A heading with no following paragraph is a finding
    (surfaces a section that opens on a float/list with no stated point).
  - *O3 — section ids are unique.* Two sections resolving to the same id collide the outline's join key.
  - *O4 — heading nesting is well-formed.* No jump from H2 to H4 without an intervening H3 (an outline hole).

### 2.2 Conceptual view (specified)

- **Quality question.** Does every core concept have a definition and a home, and do the inter-chapter
  links and the floats (figures/tables) actually connect the concepts they claim to?
- **Typed schema.**
  ```
  ConceptModel
   └─ Concept(slug, name, kind, book_home, site_home, status, defined_in, referenced_by[])
   └─ ChapterLink(from_chapter, to_chapter, anchor_text)      # [text](chapter.html) edges
   └─ Float(label, kind, chapter, caption, introduced_by_ref) # figure/table/mermaid, joined to its [ref:]
  ```
  `Concept` is the *existing* `book/data/concepts.json` shape (reuse it verbatim — this view formalizes it
  as one of the 4+1 and adds the link/float layers around it).
- **Md symbols referenced.** `<!-- index-def: slug -->` (126×, concept anchors), `<!-- index-example: slug
  -->` (12×), `<!-- label: key -->` (43×, float labels), `[ref:key]` cross-refs, `[text](chapter.html)`
  inter-chapter links. **All existing** — the conceptual view needs no new symbol; it composes symbols
  already in use.
- **Invariants.** Every concept's `book_home` resolves to a real `index-def` (already L1). Every float has
  a caption and is introduced by a `[ref:]` before it (already the `book-float-ref` gate). New: every
  concept referenced in prose (`[ref:]` to a concept anchor) resolves to a defined concept; the
  chapter-link graph has no dangling target.

### 2.3 User-journeys view (specified)

- **Quality question.** Does each "how to read this book" path still traverse real parts in the promised
  order? This is the direct analogue of the product's `user-journey-model` — an *actor* pursuing a *goal*
  through *ordered steps*, each step joined to the structural element it visits.
- **Typed schema.**
  ```
  JourneyModel
   └─ Journey(id, actor, goal, steps[])
       └─ Step(order, target_part_or_chapter, description)   # each step joins to a real part/chapter slug
  ```
  The three journeys already worked out in the preface's "A map of the book" section
  (`{#...}` home, float `[ref:book-map]`):
  - **`read-straight-through`** — actor: first-time reader; goal: follow the argument in order; steps: Part
    1 → 2 → 3 → 4 → 5 → back matter.
  - **`do-it-monday`** — actor: practitioner; goal: apply this now; steps: Part 1 → Part 4 → dip into Parts
    2–3 as a technique needs its foundation.
  - **`be-convinced-first`** — actor: skeptic; goal: see the method survive a real system before learning
    the how; steps: Part 1 → Part 5 → back for the how.
- **Md symbols referenced.** The `[ref:book-map]` float (existing) as the journeys' home; **one new
  symbol** to mark each journey and its steps in the prose so the model joins to the exact sentence that
  promises the path (see §3 — `journey` / `journey-step`).
- **Invariants.** Every step's `target_part_or_chapter` resolves to a real part number / chapter slug in
  the book (join against the outline view). Every journey named in the model is described in the prose and
  vice versa (two-way coverage, mirroring the concept model's L3/L4).

### 2.4 Cross-reference graph (specified, recommended)

- **Quality question.** Does every cross-reference resolve, and does the reference structure hold where it
  should (a float is introduced before it appears; a `[ref:]` names a real label)?
- **Typed schema.** `Edge(kind, from_chapter, from_block, target, resolves)` over three edge kinds:
  `ref` (`[ref:key]` → a `<!-- label: key -->` float), `chapter-link` (`[text](x.html)` → a real
  chapter), `concept-ref` (prose → an `index-def`). This is a thin projection over `book_ir`'s existing
  `Document.refs()` and `Document.labels()` — most of it is *already computed by the IR*, so this view is
  cheap.
- **Md symbols referenced.** `[ref:key]`, `<!-- label: key -->`, `[text](chapter.html)` — all existing.
- **Invariants.** Every `ref` edge resolves to a label (already the `book-float-ref` gate covers the
  before-its-float rule; this generalizes to *all* refs). No chapter-link points at a non-existent page.

### 2.5 Principle-weave view (specified, recommended)

- **Quality question.** The book rests on two principles (the Modeling Principle, the Alignment Principle). Part 2
  claims to develop one and Part 3 the other. Are the principles actually *woven* through the parts that claim
  them, or only asserted in the preface?
- **Typed schema.** `PrincipleWeave(principle_slug, claimed_parts[], woven_at[])` where `woven_at` is the set of
  chapters that carry a `<!-- principle: modeling|alignment -->` marker. `tests/book.py` already runs a
  "principle-woven" audit; this view formalizes its result as a queryable model.
- **Md symbols referenced.** The concept anchors for `modeling-principle` / `alignment-principle` (existing);
  **one new symbol** — a `<!-- principle: slug -->` marker an author drops in a chapter that develops a
  principle, so the weave is explicit rather than heuristic.
- **Invariants.** Every claimed part has ≥1 `woven_at` chapter. No principle is claimed by a part it never
  touches.

### 2.6 Learning-outcomes view (built)

The book is a textbook, so it is modeled as one: this view names what a reader should be able to **DO or
KNOW** after each unit, and maps each outcome to the unit that teaches it. It has no Kruchten analogue — it
is a book-specific pedagogical view, the direct answer to the author's ask ("learning outcomes … another
view, perhaps partially derived or annotative").

- **Quality question.** Does every teaching unit — the book, each Part, each chapter, and the sampled
  sections — declare what a reader can do after it; does each outcome map to a real outline unit; and does
  the Part→chapter→section outcome tree decompose without a pedagogy gap?
- **Typed schema.**
  ```
  OutcomeModel
   └─ Outcome(outcome_id, granularity, primary_unit, secondary_units[],
              verb, obj, statement, bloom, provenance, anchor, gap_note)
  ```
  - `primary_unit` + `secondary_units[]` — an outcome maps **one-primary-to-many-elaborative**, not
    one-to-one. The `primary_unit` is where the outcome is **chiefly taught / delivered**; each of
    `secondary_units` is an **elaborative** unit that reinforces, extends, or applies it. Both are join keys
    into the outline view (a `section_id`, a chapter `slug`, `part-<N>`, or `book`). An outcome that spans
    units — a principle chiefly stated in Part 2 but reinforced in Part 4 and the case study — records that
    span instead of being duplicated or arbitrarily pinned to one place. An outcome whose `primary_unit` no
    longer resolves is a finding (U1); a `secondary_unit` that no longer resolves, or equals the primary, is
    a finding (U7).
  - `granularity` ∈ {`book`, `part`, `chapter`, `section`} — the tier **of the primary unit**. Book-level
    outcomes decompose *down* into Part → chapter → section outcomes.
  - `verb` + `obj` — an outcome is an **action verb + object** ("distinguish · a constraint from a
    sensor"). `verb` comes from a closed **Bloom-level taxonomy** (below); `bloom` is derived from it.
  - `provenance` — the honesty tag (below): `derived` | `declared` | `gap-recommended`.
  - `anchor` / `gap_note` — the grounding: for a `derived`/`declared` outcome, the topic sentence or heading
    it rests on; for a `gap-recommended` one, why the unit falls short.
- **Coverage semantics — primary drives coverage.** A unit "covers" an outcome only when it is that
  outcome's **primary**. Appearing in `secondary_units` reinforces an outcome **owned elsewhere** and does
  **not** by itself make the reinforcing unit covered — so a unit that only ever appears as an elaborative,
  and is no outcome's primary, is still a coverage **gap**. The rationale is the gap list's job: it is the
  author's fill worklist, and a unit earns its keep by *primarily delivering* something, not by echoing a
  point taught elsewhere. The digest still shows a section's elaborative role (so the author sees it is not
  idle), but an echo alone does not clear the gap.
- **The verb taxonomy.** A closed set of teaching verbs grouped by the six Bloom (2001-revision) cognitive
  levels — **know** (recall/recognize/define…), **understand** (explain/describe/distinguish…),
  **apply** (apply/use/compute/write…), **analyze** (classify/map/trace/situate…), **evaluate**
  (evaluate/judge/size/choose…), **create** (design/construct/author/model…). The set is tuned to *this*
  book's pedagogy — outcomes run from "recognize a mechanism" up to "design a control." An outcome's verb
  must be in the set, so the Bloom level is derivable from the verb alone and the vocabulary stays uniform
  (checked as invariant U2).
- **Derived, declared, or gap-recommended (the honesty split).** Mirroring the outline's derive-what-you-can
  / annotate-the-residual move, one level up — but with a **three-way** tag, because the author wants the
  induction honest *and* wants gap recommendations:
  - **`derived`** — grounded in what the unit teaches **as written**, traceable to an anchor. Some are
    *lifted mechanically* from a topic sentence whose first word is a teaching verb ("Name both ends before
    you move." → *know · name both ends*); the rest are hand-authored but tightly anchored to a real heading
    or topic sentence. The derivation is kept **high-precision on purpose**: navigational imperatives
    ("Start at the decision on the left", "Read the stack as …") are *refused*, because lifting them would
    manufacture a garbled outcome masquerading as taught content.
  - **`declared`** — a real outcome the existing (sometimes thin) prose roughly supports, made explicit by
    the author. The chapter / Part / book outcomes are declared — each synthesized across the unit's section
    titles and arc, and citing that arc as its anchor.
  - **`gap-recommended`** — the outcome a **missing or inadequately-delivered** unit *ought* to deliver;
    content that does not yet exist. Never masqueraded as derived. The two sections whose heading promises a
    teaching point but whose opening block is a non-paragraph (the outline's O2 findings) are the cleanest
    examples — the heading names an outcome the prose does not state.

  The `declared` + `gap-recommended` sets are exactly the **author's rearrange/fill worklist**; the
  `derived` set is what the book teaches today.
- **How it maps onto the outline.** The outcome model is a *projection over the outline view*. Every
  `primary_unit` and `secondary_unit` is an outline key; the coverage check re-derives the outline and
  joins. A chapter is "covered" when it is the primary of a chapter outcome *or* owns a section that is the
  primary of one — an elaborative reference does not count (primary drives coverage). The mechanical
  derivation reads the outline's topic sentences directly. So the two views share one structural source —
  the outline is the outcomes view's substrate, not a parallel parse.
- **Invariants (checked by the drift check).**
  - *drift* — `outcomes.json` equals a fresh derivation (declared outcomes merged with derived candidates).
  - *U1 — every outcome's `primary_unit` resolves* to a real section id / chapter slug / `part-N` / `book`.
  - *U2 — every verb is in the taxonomy* and `bloom` equals the verb's level.
  - *U3 / U4 / U5 — every chapter, every Part, and the book is the PRIMARY of ≥1 outcome* (a unit that is no
    outcome's primary is a pedagogy gap the author fills — an elaborative-only unit does not clear it).
  - *U6 — every provenance tag cites its grounding* (a `derived`/`declared` outcome names an anchor; a
    `gap-recommended` one names why the unit falls short) — the honest-labeling discipline, enforced.
  - *U7 — every elaborative (`secondary`) unit resolves* to a real outline unit and is distinct from the
    primary (a mistyped or self-referential elaboration is a finding).
  - *(informational, not gated)* — the **no-primary-section list**: sections that primarily deliver no
    outcome (annotated when they at least serve as an elaboration). This is the fill worklist for the
    author's next phase, printed by `python3 book-models/outcomes_model.py gaps`, not a gate finding (this
    PoC covers a representative sample of sections as primaries, not all 164).

---

## 3. The symbol scheme

The models reference symbols in the markdown. The governing constraint: **the notation-leak gate and the
renderer share one vocabulary SSOT (`MARKER_KEYWORDS` in `build_book.py`), and that file is owned by
the concurrent C→A migration — this design must not require editing it for the PoC.** A new marker keyword
that the renderer does not know how to consume ships as escaped visible text (`&lt;!-- sec: … --&gt;`), an
ugly leak. So the scheme is layered:

### 3.1 Existing symbols reused (no new work)

| Symbol | Count | Views that use it |
|--------|------:|-------------------|
| `{#slug}` heading anchor | 22 | Outline (stable section id) |
| `<!-- index-def: slug -->` | 126 | Conceptual (concept definition anchor) |
| `<!-- index-example: slug -->` | 12 | Conceptual (concept example anchor) |
| `<!-- label: key -->` | 43 | Conceptual, Cross-ref (float labels) |
| `[ref:key]` | — | Conceptual, Cross-ref, Journeys (float refs; book-map home) |
| `[text](chapter.html)` | — | Conceptual, Cross-ref (inter-chapter links) |

### 3.2 Structural derivation — symbols the model computes, not the author annotates

Two facts the outline needs are **derived structurally**, so they need *no* symbol at all:

- **Topic sentence** = the first sentence of the first paragraph block following a heading. `book_ir`
  already gives the block sequence; the model walks it. (162 of 164 headings are followed by a paragraph;
  the 2 that are not are exactly the O2 findings the view should surface.)
- **Derived section id** = a slug of the heading text, used when no explicit `{#slug}` exists. So the
  outline is *complete on day one* with zero md edits — explicit `{#slug}` anchors upgrade a derived id to
  a curated one incrementally, and the model reports the `derived` count as the "sections still wanting a
  stable anchor" backlog.

**This is the key design choice for the PoC: the outline view is 100% derivable from the current book with
no new markdown symbol.** It rides `{#slug}` where present and derives the rest.

### 3.3 New symbols proposed (for the author to ratify, needed by later views)

Two views want a symbol the vocabulary does not yet have. Both are **HTML-comment style, degradation-
friendly** (invisible in a plain MD viewer), consistent with the existing directives — and both require
one `MARKER_KEYWORDS` row, which is a **reconciliation item with the C→A agent** (§6), not a PoC edit.

| New symbol | Notation | Purpose | Est. md sites |
|------------|----------|---------|---------------|
| `<!-- journey: id \| actor \| goal -->` + `<!-- journey-step: id \| order \| target -->` | HTML comment, arg-delimited by `\|` (matches `figure:`'s `src \| caption` convention) | Anchors each reading path and its steps to the exact prose that promises it (User-journeys view) | ~3 journeys × ~4 steps ≈ 15 markers, all in the preface's "A map of the book" section |
| `<!-- principle: modeling\|alignment -->` | HTML comment, enum arg | Marks a chapter that develops a principle (Principle-weave view) | ~6–8 (the Part 2 / Part 3 chapters) |

**Recommended notation rule for all new book-model symbols:** an arg-bearing marker uses `keyword: arg`
with `|`-delimited fields (the established `figure:` / `table:` convention), lives on its own line, and
degrades to an invisible comment in any plain markdown viewer. This keeps the scheme uniform with what the
book already teaches and what `book_ir`'s `_MARKER_LINE` already parses.

Until the C→A agent adds these keywords to `MARKER_KEYWORDS`, the journeys and principle-weave views can
still be authored **derived-from-existing-prose** (the journeys are already fully described in the preface;
the principle-weave audit already runs heuristically) — the new markers make the join *exact and stable*
rather than heuristic, which is the upgrade, not the enabler.

### 3.4 Notation decision for the outcomes view — model-file declarations, no inline marker

The outcomes view carries facts the prose does not fully state (a synthesized chapter outcome, a
gap-recommended outcome for content that does not yet exist). Two places those could live:

- **In the model file** — an `outcomes_declared.json` keyed by the outline's unit ids, hand-authored, that
  the model merges with the mechanically-derived candidates.
- **Inline in the markdown** — an `<!-- outcome: verb | object -->` marker beside each heading.

**This PoC chose the model file, and recommends it stand.** Three reasons:

- **Renderer stays uncoupled.** A model-file declaration needs no `MARKER_KEYWORDS` row and no renderer
  change — so the outcomes view ships with zero risk of the notation-leak an unknown inline keyword causes,
  and with no reconciliation dependency on the renderer.
- **Gap-recommended outcomes have no home in the prose by definition.** A `gap-recommended` outcome names
  content that does not exist yet; there is no heading to hang an inline marker on. The worklist has to live
  outside the prose it is a worklist *for*.
- **The declarations ARE the author's editable surface.** `outcomes_declared.json` is the one file the
  author hand-edits; `outcomes.json` and the reviewable `outcomes-draft.md` digest are generated from it.
  Keeping the declarations in one queryable file (not scattered across 28 chapter files) is what lets the
  author read the whole pedagogy at once — the reason to model it at all.

An inline `<!-- outcome: … -->` marker remains a *possible later upgrade* for the `derived` outcomes (it
would let a section state its own outcome next to its heading, and the model would join on it instead of
re-deriving). If pursued, it follows the §3.3 rule — HTML-comment, `|`-delimited, one `MARKER_KEYWORDS` row
added deliberately as a documented reconciliation step, never a silent PoC edit. It is explicitly **not**
wired here.

---

## 4. How each model stays honest — the drift check

Every view ships with a **drift check that re-derives the model from the source and fails on divergence** —
the book's own `derived-not-snapshotted` discipline, dogfooded. The contract (identical to the starter
kit's drift-lint contract and the `concepts.json` L1–L4 precedent):

1. **Load the stored model** (its declared sections / journeys / concepts) from the `book-models/*.json`
   sidecar.
2. **Re-derive the model from the book** via `book_ir` + the thin helper, the same call sequence the build
   uses.
3. **Set-diff the two.** An element in the derived set but not the stored one (a section added without
   regenerating), or the reverse (a stored section the book no longer has), is a finding.
4. **Re-run every derived field** (topic sentence, id_source) and assert it equals the stored value.
5. **Exit non-zero on a finding** — but land **audit-only first** (repo rule-#55 discipline): the check
   contributes zero to the fail count until a fix-wave drains the seed findings, then a follow-up promotes
   it to blocking. This is exactly how `concepts.json`'s L1–L3 landed (audit-only → drain → gate).

The outline view's and the outcomes view's drift checks are both implemented in `tests/book_models.py` and
registered in `catalog_tests.py` as **audit-only** (`check_outline_model`, `check_outcomes_model`).

**Derived-not-stored, taken further.** The purest form (what the outline PoC does) stores *nothing* and
re-derives the whole model on every run, so there is no sidecar to drift at all — the "stored model" is
regenerated into `book-models/outline.json` as a queryable artifact carrying a provenance header, and the
drift check asserts the on-disk artifact equals a fresh derivation (a hand-edit or a stale regen is the
finding). This matches the repo's auto-generated-file provenance discipline.

---

## 5. Where the model files live

```
book-models/
  DESIGN.md                 # this doc
  book_symbols.py           # THIN helper over book_ir (heading ids, topic sentences) — read-only over book_ir
  outline_model.py          # the Outline view: types + derive_outline() + regenerate/verify
  outline.json              # the materialized outline (provenance-headed, TRACKED)
  outcomes_model.py         # the Outcomes view: types + verb taxonomy + derive_model() + regenerate/verify/gaps
  outcomes_declared.json    # HAND-AUTHORED source: declared + gap-recommended outcomes, keyed by unit id
  outcomes.json             # the materialized outcomes model (provenance-headed, TRACKED)
  outcomes-draft.md         # GENERATED reviewable digest — the actual outcome statements, book->part->chapter->section
tests/
  book_models.py            # the drift check(s), registered audit-only in catalog_tests.py
```

Rationale: a top-level `book-models/` dir mirrors the product's `models-bridge/system-models/` genre (typed
model files next to a design doc), keeps the book-about-the-models cleanly separated from the book prose
under `book/`, and gives the future multi-view build one obvious home. The thin helper stays *out* of
`book/book_ir.py` (owned by the C→A agent) as a separate module, with its wanted `book_ir` extensions
written down for reconciliation (§6).

---

## 6. `book_ir` extensions wanted (reconciliation with the C→A migration)

The thin helper `book_symbols.py` computes two things `book_ir` does not yet expose (a third, B1, was a
defect and is now fixed — see below). Once the C→A migration lands, fold these into `book_ir` so there is
one typed layer, not two:

1. **Heading `{#slug}` id extraction.** `book_ir`'s `Block` for a heading carries the raw `## Text {#slug}`
   but does not split the `{#slug}` id off. Wanted: `Block.heading_id: str | None` (parsed with the
   renderer's own `_HEADING_ANCHOR_RE`, the SSOT) and `Block.heading_text` (the id stripped). Today the
   helper re-runs that regex; the reconciled form imports the renderer's regex so there is no second copy.
2. **`index-def` / `index-example` concept anchors as typed refs.** `book_ir` records a lone
   `<!-- index-def: slug -->` as a `DIRECTIVE` block with `directive="index-def"` but does not expose the
   slug as a first-class field. Wanted: a `ConceptAnchor(slug, kind, chapter, block_index)` accessor on
   `Document`, so the conceptual + cross-ref views join on it without re-parsing.
3. **Topic-sentence accessor.** Wanted: `Chapter.section_topic_sentences() -> list[(heading_block,
   first_para_block)]`, the heading→following-paragraph pairing the outline derives, so every view that
   needs "the paragraph that follows this heading" shares one implementation.

**Bug B1 — FIXED (found while building the outline PoC; fixed while building the outcomes view).**
`book_ir.Block.heading_level` read **0 for a real H2/H3** when a marker comment was glued to the head of
the heading's block (e.g. `<!-- index-def: refactoring-is-free -->` on the line above `## …` with no blank
line). Cause: `_parse_chapter` computed `heading_level` from the block's ORIGINAL `first = lines[0]`, but
that first line was the peeled marker, not the `#` line, so `len(first) - len(first.lstrip("#"))` was 0. It
reproduced on **5** headings in `4.5-lessons-learned.md`. **Fix (landed):** compute `heading_level` from the
*remaining* heading line after marker-peeling, not the original `first`. The HTML render was never affected
(the renderer computes its own heading depth), so the fix is byte-identical. With B1 fixed, the helper's
former `heading_level()` workaround was dropped — `book_symbols` now reads `Block.heading_level` directly.

None of the remaining extensions blocks the PoC — the helper computes both today. They are the
*unification* targets once the C→A work is fully in; B1 is now off the list.

---

## 7. Ratification — settled defaults, and the open calls for the outcomes view

The author has **ratified the build-forward defaults**: the view set is GO (build the views out); model
files live in top-level `book-models/`; drift checks land **audit-only-first** (rule-#55 discipline); the
JSON artifacts are **tracked** (provenance-headed, diffable in PRs). Those four earlier questions are
answered — the outline and outcomes PoCs both follow them.

**Also settled (author review, second pass):** an outcome carries a **primary unit + elaborative
secondary units** (one-primary-to-many), and **primary drives coverage** — a unit clears its gap only by
being some outcome's *primary*; an elaborative-only reference does not (§2.6). The schema, the declared
data, the digest, and the U3–U5/U7 checks all follow this.

What remains open is specific to the outcomes view and to the still-unbuilt views:

1. **Verb taxonomy.** Approve the six-level Bloom-grouped closed set (§2.6) as the outcome vocabulary? It is
   tuned to this book; adding a verb is a one-row edit to `BLOOM_VERBS`. A reader who prefers a
   coarser/finer scale (e.g. a three-tier know/apply/create) would change this table.
2. **Section-coverage scope.** This PoC declares outcomes for the book, all 6 Parts, all 24 taught
   chapters, and a **representative ~18-section sample** as primaries — not all 164 sections. Confirm the
   next phase fills the rest (the `gaps` worklist), and confirm a section is only *informationally* required
   to be some outcome's primary (no U-invariant forces every section to primarily deliver one — the author
   decides which sections earn their own primary outcome versus stay purely elaborative).
3. **Gap-recommended review.** The three `gap-recommended` outcomes (§2.6) are *proposals* for content that
   does not exist — the author confirms, rewrites, or rejects each. Are three the right seed, or should the
   PoC surface more of the O2 / thin-opener sections as gap recommendations?
4. **Inline outcome marker (later).** Adopt the model-file-only notation now (§3.4), and treat an inline
   `<!-- outcome: verb | object -->` marker as a *deferred* upgrade for `derived` outcomes — added
   deliberately with one `MARKER_KEYWORDS` row when/if the author wants a section to state its own outcome
   in place?
5. **Promotion to blocking (both views).** When the seed findings are drained (the outline's 2 O2 findings;
   the outcomes view's section-coverage backlog, once the author decides the coverage bar), flip both
   audit-only checks to blocking — the same drain-then-gate path `concepts.json` took.

---

## 8. The drift layer — the reverse index + the three kinds of drift

The views point *forward* at md symbols. That is enough to build them, but not enough to answer the
question the author asks while rearranging: **"if I edit section X, which view elements break?"** Held as
forward references alone, that question is an O(views·elements) re-scan every time. So the drift layer adds
one derived projection and splits drift into the kinds the book's own thesis names.

### 8.1 The reverse index — a derived projection, never hand-authored

`book-models/reverse_index.py` inverts every built view's forward references into
**`{md symbol → [view elements that depend on it]}`**, materialized to a provenance-headed, tracked
`reverse_index.json` with a `regenerate` / `verify` CLI mirroring `outline_model.py`.

- **An md symbol** is a section id / heading anchor, a concept slug (`index-def`), a float label, a ref
  key, a chapter slug, or a synthetic unit (`part-<N>` / `book`). Each symbol kind names a *different*
  source construct an edit can touch, so the index keeps them typed, not one flat string set.
- **The forward edges inverted, per built view:** the **outline** contributes one edge per section — a
  section *rides* its own section id (`section-anchor` role); the **outcomes** view contributes an edge
  per outcome's `primary_unit` (`primary-unit`) and per `secondary_units` entry (`secondary-unit`). Each
  reverse edge records *which view*, *which element*, and *what role* — so a `deps` answer explains the
  nature of each break, not just a count.
- **It cannot itself drift.** It stores no hand-authored truth; `build_index()` re-inverts the views from
  the current source every run. A stale `reverse_index.json` is caught by the freshness check below, the
  same way `outline.json` is.

**The query.** `python3 book-models/reverse_index.py deps <symbol>` prints every view element that depends
on the symbol, with its role, and whether the symbol still resolves in the source (a non-resolving symbol
is itself a dangling signal). This is the "edit section X → what breaks?" answer as one dict lookup.

### 8.2 Three kinds of drift, split by mechanizability

The book's two-kind split (structural → lint, semantic → review) resolves, for this view layer, into
**three** concrete checks — two mechanical (a pre-commit lint) and one not (a review-gate agent audit):

1. **Structural drift (deterministic → lint).** Every view→md reference re-resolves against the *current*
   source: a section id / chapter / part / concept / label a view points at must still exist. A dangling
   reference reddens. **The reverse index is what makes this a single walk** over the inverted edges,
   rather than a per-view re-scan. Walked by `reverse_index.structural_findings`.
2. **Freshness drift (deterministic → lint).** Re-derive each view artifact — `outline.json`,
   `outcomes.json`, `reverse_index.json` — from source and diff against the committed file. A stale
   artifact (source edited, artifact not regenerated) is a finding. This is the auto-generated-file
   provenance discipline, applied to every view sidecar.
3. **Semantic drift (NON-mechanical → review-gate agent audit, NOT a lint).** Does a paragraph's prose
   still *deliver the point it claims*? No deterministic check answers this — it is "a question you keep
   asking" (book part 5, §"the substrate that keeps the models honest"). So it is an **agent audit at a
   review gate**, not a pre-commit lint. It is named here for completeness and to fix the boundary: the
   pre-commit lint owns #1 and #2; #3 belongs to the drain-phase review gate (§9).

### 8.3 The pre-commit home

A fast entry point — `python3 catalog.py views-audit` — runs the two mechanical kinds (structural +
freshness) over all three view artifacts, plus the views' own invariant walks (outline O2–O4, outcomes
U1–U7), and is wired into `hooks/pre-commit`. It is **sub-second** on this ~50K-word book (the `book_ir`
parse is the only real cost, ~0.2s including interpreter start), so it fits the commit path with no felt
latency.

It lands **audit-only-first** (the repo's blocking-lint landing discipline): it *prints* findings and
exits 0, so it never reddens an in-flight commit. `catalog.py views-audit --strict` exits 1 on any
finding — the one-line flip a follow-up wires into the hook once the seed findings are drained (the same
drain-then-gate path §7.5 and `concepts.json` took). The reverse-index drift also registers as an
audit-only `Check` in `catalog_tests.py` (`check_reverse_index`), so the test suite covers it alongside
the outline and outcomes checks.

### 8.4 What the drain phase inherits — the guardrail

When the drain deepens the outline to paragraph granularity (§9), the reverse index + the structural +
freshness audit are already in place as its guardrail: **the moment the drain authors a paragraph-point
reference, that reference is a symbol the reverse index inverts and the structural audit re-resolves.** A
drain edit that renames a section, retires a paragraph, or moves a point cannot silently strand a view
element — the audit reddens (audit-only until promoted). The guardrail is built *before* the churn it
guards, not after.

---

## 9. Drain-spec refinement — canonical outline points (a spec note for the future drain, not built here)

The author refined how the drain will deepen the OUTLINE view. Recorded here as a spec note for the
drain phase; **no implementation now.**

> **Canonical outline points — induced, not lifted.** At paragraph granularity the outline stores each
> paragraph's *canonical point* — "if a machine wrote this, what's the sentence" — the normalized
> statement of the idea, NOT the prose sentence as rendered (which carries segues and rhetorical framing).
> This reframes the outline from an index-of-the-prose into a **content/idea model the prose renders.**
> Consequences: (a) the point is an *induction* (a faithful normalization of what the paragraph actually
> says — honest, not invented; a paragraph with no clear point is a GAP); (b) it doubles as a
> **redundancy detector** — two paragraphs that induce the same canonical point are a duplication;
> (c) **concepts join at paragraph granularity** (each paragraph carries the ideas it deploys); (d) drift
> is the two-kind split — structural (the paragraph/anchor still resolves) is a lint, semantic (does the
> prose still make this point) is a review-gate, so paragraph-points are authored/declared references.
> These authored paragraph-points are exactly the kind of reference the reverse index + drift audit must
> cover once the drain lands.

### 9.1 The `<!-- point: … -->` decorator (a drain-phase notation addition, flagged — not added now)

What makes the semantic check (§8.2 #3) tractable at the drain: each paragraph/section gets an inline
**`<!-- point: <canonical statement> -->` decorator** — the canonical point authored *right above* the
prose it summarizes. Two payoffs:

- **The outline becomes model-from-decorator.** Today the outline derives the topic sentence structurally
  (the first sentence of the following paragraph). With the decorator, the model derives the point *from
  the decorator*, and the prose is checked *against* it — the model's source of truth moves from
  incidental prose shape to an authored statement.
- **The semantic audit goes local.** Because the claim sits beside its prose, the review-gate agent audit
  compares claim↔prose *locally* — a bounded, per-paragraph judgment — rather than holding the whole
  chapter to spot a sense-mismatch. It also makes redundancy *exact* (two decorators, same point =
  duplication) and lets concepts join at paragraph granularity.

**Notation.** A `<!-- point: … -->` directive is HTML-comment style, degradation-friendly (invisible in a
plain MD viewer), and consistent with the existing markers — but it needs one `MARKER_KEYWORDS` row so the
renderer strips it from the HTML rather than leaking it as escaped visible text. That row is a
**drain-phase addition and a reconciliation item with the renderer owner** (§3.3 / §6), authored
deliberately, **not** a change made here.

**The reverse index must cover it.** Once the drain lands, each `<!-- point: … -->` is an *authored*
reference (an induced claim about a paragraph, not a structural fact) — exactly the drift-prone kind. The
reverse index inverts it and the structural + freshness audit re-resolves it, on the same footing as a
section id or an outcome unit today. So §8's guardrail already has the shape the drain needs; the drain
adds the symbol kind, not a new drift mechanism.

---

## 10. The corrected point form + the two-tier term model (BUILT — the substrate for the reform)

The first drain landed the `<!-- point: <slug> | <text> -->` decorator, but the *text* segment drifted into
a **verbose paragraph paraphrase** — a whole sentence-run restating the prose, ignoring any controlled
vocabulary. That is the wrong form: a canonical point is a short *claim*, not a re-say of the paragraph. The
form below corrects it, and the substrate for it is now built. The **content reform** (rewriting the 175
existing verbose points to the new form) is a **separate later pass**; this section documents the machinery
the reform runs against.

### 10.1 The corrected point grammar — three `|`-segments (3rd optional)

```
<!-- point: <slug> | <claim> | terms: <t1>, <t2> -->
```

- **`<slug>`** — the kebab id, unchanged. The reverse-index symbol the outline rides at paragraph
  granularity; the redundancy key (two paragraphs, same slug = a redundancy).
- **`<claim>`** — a short **declarative sentence**, not a paraphrase. Capped at **≤10 words**
  (`CLAIM_WORD_CAP`), where a word is a whitespace-separated token in the claim segment *only* — a
  deterministic, machine-checkable count. `book_ir` parses it into `Block.point_text`; the
  `point-claim-word-cap` lint counts `point_text.split()`. The cap is what makes a point a *point*: it
  forces the induced claim down to its irreducible statement, so the outline reads as a spine of terse
  claims, not a second copy of the prose.
- **`terms:`** (optional 3rd segment) — a comma-separated list of tier-2 **LOCAL** term slugs the paragraph
  deploys. Parsed into `Block.point_terms: list[str]`. **Backward-compatible:** a 2-segment
  `point: <slug> | <text>` with no `terms:` still parses, with `point_terms = []`, so the reform can migrate
  incrementally.

### 10.2 The section-terms marker — the tier-1 sibling

```
<!-- section-terms: <t1>, <t2> -->
```

A NEW inert marker placed under a section heading (**H2/H3**, and **H4 ratified** where a chapter drills into
`####` sub-sections — e.g. 4.1's "Coverage, run backwards" / "Data from the case study"; the marker attaches
to whatever section heading it sits under), naming the **1–3 major concepts the section develops**.
Parsed into `Block.section_terms: list[str]`. It is a `MARKER_KEYWORDS` row (`section-terms`), classified in
`book_ir` as a `DIRECTIVE`-inert block, and **stripped byte-identically** — from the render (the renderer's
leading-marker peel) AND from the occurrence-index scan (`_strip_point_decorators` now strips both `point`
and `section-terms`, so a term named only inside a marker never spawns a phantom index reference). It renders
NOTHING; the reverse index reads it from the IR.

### 10.3 The two-tier term registry — REUSE, not a parallel registry

Every tagged term (a point `terms:` slug, tier-2; a `section-terms` slug, tier-1) must resolve to a
**registered term carrying a `tier` ∈ {`section`, `local`}**. The registry **reuses `index-terms.md`** — the
existing SSOT of the 135 `- concept:` slugs — under a new **`## Term tiers`** section:

- Every `- concept:` slug **defaults to `tier: section`** (tier-1). No per-concept row is needed; the 135
  existing concepts are seeded section-tier on day one, so a section can be tagged against any of them
  immediately.
- A new fine-grained tier-2 term that is NOT a concept gets an explicit **`- term: <slug> | local`** row.
- An explicit `- term: <slug> | <tier>` row also **overrides** a concept's default (demote a broad concept
  to `local` where a paragraph uses it narrowly).

The loader is `build_book._load_term_tiers()` → `{slug: tier}` (concepts seeded section, `- term:` rows
register/override) — one reader, no parallel parse. `TERM_TIERS = ("section", "local")` is the closed tier
set. This keeps `index-terms.md` the single term SSOT, joined on the same slug the concept registry,
`concepts.json`, and the book's `index-def` tags all use. A `- term:` row for an unknown tier is a
build-loud error.

### 10.4 Reverse-index term edges — the tier-2 query

`reverse_index.py` gains a `term` symbol kind and inverts every tagged term into a term→element edge:

- a point's `terms:` entry → a **tier-2** edge (role `paragraph-term[tier-2]`, element = the point's block);
- a `section-terms` entry → a **tier-1** edge (role `section-term[tier-1]`, element = the marker's block).

So `python3 book-models/reverse_index.py deps <term>` answers **"which sections develop term X ∪ which
paragraphs use term X"** as one lookup — the union the drain needs to see a concept's whole footprint. The
`term` universe is the registered-term set (§10.3), so a tagged-but-unregistered term is a `DANGLING term`
structural finding, and `term_findings()` reports it with the clearer `UNREGISTERED term` wording the
`term-tags-registered` lint surfaces.

A section-terms slug plays the **tier-1 role**, so it must resolve to a term registered at tier `section`
(§10.3). `role_tier_findings()` reports a `local`-registered slug used in a section-terms marker as a
`TIER-ROLE MISMATCH`; the `term-tags-registered` lint surfaces it beside the registration findings.
Paragraph `terms:` slugs are unconstrained — a section concept may be reused at paragraph tier, and a local
is expected there.

**Index key scheme — namespaced by kind.** The inverted index (`build_index()` → `reverse_index.json`'s
`index`) keys every entry by **`<kind>:<slug>`**, not the bare slug. A term slug can equal a section-id slug
(`semantic-gap` the concept vs a `semantic-gap` heading anchor; a `*-model` concept vs its chapter's
section id — 19 such collisions across the drained book). A bare-slug key MERGES the two senses into one
slot, which then takes the first kind it saw and interleaves term edges with outcome-unit edges — so
`deps <slug>` mislabels the merged entry's `kind`. Namespacing keeps each construct a distinct entry, so
`kind` is always correct. Slugs are kebab and kinds are single lowercase words, so neither carries a `:`;
`key.split(":", 1)` recovers `(kind, slug)`. `deps <slug>` takes a **bare** slug, gathers every
`<kind>:<slug>` match, and prints each sense with its own (correct) kind label — the by-design union output,
now un-mislabeled. The only reader of `reverse_index.json`'s `index` is `reverse_index.py` itself (the
`deps`/`verify`/structural walks) and the drift test; no consumer reads it by bare slug.

### 10.5 The two new lints — AUDIT-ONLY-first

Both land **audit-only** (print, exit 0), wired into `catalog.py views-audit` and standable as scripts:

- **`point-claim-word-cap`** (`book-models/lint_point_claim_word_cap.py`) — a point's `<claim>` must be ≤10
  words. On the current tree it reports **~175 findings** (the whole old verbose corpus) — that IS the
  reform's fix-worklist. `--strict` exits 1 (the promotion path).
- **`term-tags-registered`** (`book-models/lint_term_tags_registered.py`, over
  `reverse_index.term_findings()`) — every tagged term resolves to a registered term with a tier.

Neither reddens a commit today. A follow-up promotes each to blocking once the reform drains its seed
(the claims to ≤10 words; every tagged term into the registry) — the same drain-then-gate path the outline
and outcomes checks take.
