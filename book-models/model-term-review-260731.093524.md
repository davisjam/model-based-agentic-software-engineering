# Book content-model + term-vocabulary review — 260731.093524

READ-ONLY review of the two-tier content model (points + section-terms + `index-terms.md` registry +
`book-models/` views). Reviewed at committed HEAD `08ecebf` (4.4 drain landed). **Concurrency note:**
the 4.5/4.6 drain was live during this review — `book/part4/4.5-lessons-learned.md`,
`4.6-generative-validation.md`, and (mid-review) `outline.json` / `reverse_index.json` changed in the
working tree. All counts below pin the committed state (283 points, 202 tagged term-symbols, 236
registered terms = 135 concepts + 101 `- term:` rows) unless marked otherwise.

## Executive summary

**The model and vocabulary are fundamentally healthy.** Every drained chapter (1.1–4.4) has full
point + section-terms coverage; the `point-claim-word-cap` lint is CLEAN at HEAD (0 findings — the
~175-item reform worklist is fully drained); every committed tagged term resolves to the registry;
there are zero duplicate point slugs; a ~25-claim spot-check across all four parts found the claims
faithful, terse, and genuinely canonical — not truncated prose. The outcomes model is complete at
book/part/chapter grain (every chapter is exactly one outcome's primary) with a sensible Bloom spread
(21 understand / 14 analyze / 13 apply / 11 create / 10 evaluate / 8 know) and honest provenance
(45 derived / 30 declared / 2 gap-recommended).

The real findings are **vocabulary-consolidation and tier-hygiene issues**, led by one core-concept
fragmentation (the drift-caveat teaching has four names), a tier-role mismatch class no lint checks
(local terms used as section-terms), and a reverse-index key collision that misreports core concepts.
None blocks the remaining drains; items 1, 2, and 3 should feed the term-consolidation pass, and
item 4's registration check belongs in the 4.5/4.6 landing gate.

---

## 1. Term vocabulary (main focus) — prioritized findings

### F1 (HIGH) — Core-concept fragmentation: the drift-caveat teaching has four names

The section "A drift check proves agreement, not correctness" (2.2, ~line 197) carries, on ONE
teaching, four different vocabulary channels:

- `<!-- index-def: drift-caveat -->` — the registered **concept** (`drift-caveat`), which is
  **never tagged anywhere** (orphan as a term);
- `| terms: drift-gate, agreement-not-correctness` — where `agreement-not-correctness` is a
  **newly-coined local** used exactly once, restating drift-caveat;
- `<!-- section-terms: drift-gate, mirror-vs-spec -->` — a third adjacent concept.

**Fix (merge):** keep `drift-caveat`; tag it on that paragraph's point (and 2.2 block-24's if
apt); delete the `- term: agreement-not-correctness | local` row and its one tag. Keep
`mirror-vs-spec` distinct (it names the derivation-authority axis, not the caveat) — but note it is
thin for its conceptual weight (1 section-tag, 2 para-tags; expected to grow with 4.6).

### F2 (HIGH) — Tier-role mismatch class: 11 `local` terms used in `section-terms` markers, unchecked

DESIGN §10.2 says `section-terms` names tier-1 terms, but 11 `local`-tier terms appear in
section-terms markers, and `lint_term_tags_registered.py` checks only registration, not
role↔tier consistency. The offenders, with (section-uses/para-uses):

- **Promote to `section` tier** (footprint proves they develop sections):
  `governance-graph` (4/9), `missing-model-metric` (3/6), `snapshot-vs-derived` (2/5) — add
  `- term: <slug> | section` rows (the row syntax already supports the override direction).
- **Judgment per-term** (1 section-use each): `documentation-hierarchy` (1/4), `shared-resource`
  (1/4), `outside-hook` (1/3), `per-host-load-profile` (1/3), `symbol-anchor` (1/3),
  `doc-derived-test` (1/2), `dense-primitive-region` (1/1), `granularity-gap` (1/1) — either
  promote, or re-tag the section-terms marker with the section's true tier-1 concept.
- **[LINT] extension:** add a role-tier consistency check to `lint_term_tags_registered.py`
  (a `section-terms:` slug must resolve to tier `section`) — audit-only-first, per the house
  discipline. Without it this class silently regrows on every drain.

### F3 (HIGH) — Reverse-index key collision: term slugs that equal section-ids merge into one entry

19 term slugs collide with section-id slugs (`the-semantic-gap`, `constraints-and-sensors`,
`service-flow-model`, `mediator-registry`, `user-journey-model`, `measure-one-level-deeper`, all the
3.x `*-model` names, …). `reverse_index.json` keys symbols by bare slug, so the merged entry takes
`kind: "section-id"` and mixes outcome-unit edges with term edges. Consequences observed:

- `deps the-semantic-gap` reports the book's central concept as "(section-id)" and interleaves
  `primary-unit` outcome edges with `paragraph-term[tier-2]` edges;
- any consumer filtering `kind == "term"` undercounts — a naive orphan scan reports **34** orphans
  when the true count is **15** (19 false positives are exactly the collisions).

**Fix:** namespace the index key by kind (`term:<slug>` / `section:<slug>`), or make `dependents`
carry the symbol-kind each edge resolved against. At minimum document the collision in DESIGN §10.4
so no tool trusts `kind` on a collided key. (The `deps` union-output is by design and fine; the
*kind label* is what misleads.)

### F4 (MEDIUM) — Orphan vocabulary: 15 registered-never-tagged at HEAD; 3 need decisions

Of 236 registered terms, 15 have zero term-role tags at committed HEAD:

- **Expected — in-flight 4.5/4.6 drains** (10): `audits-into-lints`, `autonomy-amplifier`,
  `explicitness-is-essential`, `governance-centric`, `judgment-into-infrastructure`,
  `optionality-is-poison`, `refactoring-is-free`, `tests-for-agent-failure-modes`,
  `three-ways-to-run-an-agent` (all index-def'd in 4.5), `producer-dialect-corpus`,
  `property-test-models-the-output` (4.6). **Verify tagged at 4.5/4.6 landing.**
- **Expected — chapters not yet drained** (2): `universal-language` (index-def in 0.1 preface),
  `governance-as-design-patterns` (index-def in 6.1).
- **Real decisions** (3): `drift-caveat` (→ F1); **`governance-target-product`** — registered
  concept with **no index-def and no tag anywhere in the book**; its trio siblings
  `governance-target-agent` / `-models-bridge` are tagged (1–2 para-uses each) but **also have no
  index-def**. Either give the trio index-def homes (2.1 or 6.0 look natural) or drop the unused
  `-product` row and let the other two stay para-tier vocabulary.

Also from the working tree: `lint_term_tags_registered.py` currently reports **6 UNREGISTERED
findings in 4.6** (`oracle` ×3, `never-crash-contract`, `stable-spec-point`, `shrinking`) — in-flight
drain state; confirm the drain agent registers them before commit.

### F5 (MEDIUM) — Near-duplicate: `anchor` vs `symbol-anchor`

Both name "a model claim anchored to a code symbol": `anchor` [local] 0/4 (2.5 traceability-graph
sections, 4.1 metric breakdown), `symbol-anchor` [local] 1/3 (3.1 governance-graph, 2.6).
**Fix:** fold `anchor` → `symbol-anchor` (the generic word is also a collision hazard with heading
anchors / `{#slug}` anchors in this repo's own vocabulary); re-tag 4 sites, delete the row.

### F6 (MEDIUM) — Over-fragmentation clusters in the Part-3 per-model invariant vocabulary

67 of 202 tagged terms (33%) are single-use. A long tail of judicious one-use locals is fine by
design, but three clusters look like fragmentation rather than precision:

- **`closure-*`** (3.6): `closure-meaning`, `closure-strength`, `closure-post-condition` (1 use
  each) beside the concept `journey-task-closure` (1/2). Two of the three could fold into
  `journey-task-closure` or one `closure-strength` term.
- **`*-parity` / `*-soundness` / `*-correctness`** (3.3/3.4/3.5): `contract-parity`,
  `method-parity`, `fact-consistency`, `dependency-correctness`, `ownership-correctness`,
  `lifecycle-soundness`, `placement-soundness`, `boundary-soundness`, `placement` — nine
  single-use locals naming per-model invariant kinds. If each maps 1:1 to a named model invariant
  the precision is defensible; otherwise consolidate to 2–3 axis terms (e.g. `parity`,
  `soundness`).
- **Generic single-word locals**: `tier` (0/2), `layer` (0/1), `layer-boundary` (0/1), `trunk`,
  `lens`, `seam`, `wiring` — `tier`/`layer`/`layer-boundary` overlap each other and 3.5's
  `deployment-parity`; merge to one. `trunk`/`lens` are 3.1-specific coinages the prose actually
  defines — keep, but they are fragile singletons.

**Recommended posture:** don't mass-cull singletons (fine-grained tagging is the tier-2 design), but
run the three clusters above through the consolidation pass with a keep/fold ruling each.

### F7 (LOW) — Boundary check: `missing-model-metric` vs `coverage-model-mapping`

Co-tagged in 4.1's section-terms (`missing-model-metric, coverage-model-mapping` and
`missing-model-metric, node-coverage`). If `missing-model-metric` is the *metric* the
`coverage-model-mapping` *mechanism* produces, they are distinct — but nothing records that
boundary, and their footprints (3/6 vs 3/8) heavily overlap in 2.5+4.1. Rule on it in the
consolidation pass; if merged, keep the concept slug.

### F8 (LOW) — Naming consistency

- `the-semantic-gap` is the **only** `the-`-prefixed slug in the registry (`model-zoo`, not
  `the-model-zoo`; `residual`, not `the-residual`) — and the prefix is what creates its F3
  collision with the 2.2 section id. Renaming to `semantic-gap` would fix both, at the cost of
  touching the index-def + concepts.json join; do it in the consolidation pass or explicitly
  accept the exception.
- Point slugs trend long (mean 9.4 words, max 20 — e.g.
  `the-engine-is-to-hold-a-quality-goal-with-a-mechanism-placed-up-front-or-after-a-failure-seen-twice`).
  The slug is the redundancy KEY; a full-sentence slug makes slug-equality dedup vacuous (0 exact
  dups found, but near-dups can never collide at 15+ words). Consider a soft ≤6-word slug
  guideline for future drains; not worth a retro-rename.

---

## 2. Model coherence

- **Outline** — sound. All drained chapters (1.1–4.4) carry points on every idea-bearing section;
  preamble points are used correctly (3.2/3.3/3.6 chapter-opener runs). Two wrinkles:
  - **3.6 tail**: 5 consecutive H3s under "Worked join" ("The three questions…", "The four models
    and their join keys", "The composite picture", "The invariants the join spans", "The Selector
    and Scheduler in code") have **0 points and no section-terms**. They read as reference
    tables/listings under the parent H2's marker — plausibly intentional per the granularity rule,
    but it is the only drained chapter with bare sections. Either add a one-point-per-subsection
    minimum or document a "worked-example subsections inherit the parent's section-terms"
    convention in DRAIN-PLAN.
  - **H4 placement**: 4.1 places `section-terms` under `####` headings ("Coverage, run backwards",
    "Data from the case study"); DESIGN §10.2 says H2/H3. Harmless, but ratify or normalize.
- **Outcomes** — healthy. 77 outcomes; every chapter (incl. undrained Part 5/6.0/6.1) is exactly
  one outcome's primary; 6 parts + book covered; 42 section-grain primaries is the declared
  representative sample (not a gap); 2 gap-recommended outcomes are honestly labeled. No
  chapter-primary imbalance.
- **Core-concept cross-reference** (`deps` spreads at HEAD, sec-tags/para-tags): `drift-gate` 7/13,
  `model-drift` 5/15, `executable-source-of-truth` 7/9, `sensor` 2/11, `constraint` 1/8,
  `residual` 1/7, `four-plus-one-views` 3/5, `model-from-code` 1/9 (spanning all six Part-3
  chapters), `the-semantic-gap` 2/7 — all sensible multi-chapter footprints. Thin ones:
  `mirror-vs-spec` 1/2 (F1/F5 cluster; watch after 4.6 lands), `alignment-principle` 1/2 vs
  `modeling-principle` 3/4 (the Alignment Principle's home chapters 4.5/2.4-adjacent are the ones still
  draining — recheck after).
- **Registry hygiene note:** `_counts.universe.concepts` said 131 at HEAD vs 135 `- concept:` rows
  in `index-terms.md` — likely the 4 rows added after the last regen (consistent with the
  regeneration that occurred mid-review); confirm the post-4.6 regenerate closes it.

## 3. Point-claim quality (spot-check, ~25 claims across parts 1–4)

Verdict: **good — the reform achieved its intent.** Claims are induced statements, not truncations:
"A drift gate proves agreement, not correctness", "MBSE failed on upkeep, not on its ideas",
"You move this metric by adding a model", "A cloud bill reports; splitting it by service acts" are
canonical spines. No claim in the sample read as arbitrary truncation; word-cap lint is clean at
HEAD. One marginal pattern: a few points decorate one-line segue paragraphs (e.g. 2.2's
`enforce-at-the-wrong-level-and-the-property-slips-through` sits on a single transition sentence
pointing at `[ref:semantic-gap]`), which the granularity rule says to skip — harmless, but drains
should keep skipping pure segues.

---

## Recommended routing (for the orchestrator)

1. **[FIX] F1** drift-caveat merge (2.2, registry) — small, do in the term-consolidation pass.
2. **[FIX+LINT] F2** promote 3 locals to section tier + role-tier lint extension (audit-only-first).
3. **[FIX] F3** reverse-index key namespacing (or documented caveat) — `reverse_index.py`.
4. **[AUDIT] F4** at 4.5/4.6 landing: verify the 10 expected orphans got tagged + the 6 unregistered
   4.6 terms got `- term:` rows; then rule on the `governance-target-*` trio.
5. **[FIX] F5** fold `anchor` → `symbol-anchor`.
6. **[DESIGN] F6/F7** cluster keep/fold rulings in the consolidation pass.
7. **[DESIGN] 3.6 tail + H4 placement**: ratify or normalize; one line in DRAIN-PLAN either way.
