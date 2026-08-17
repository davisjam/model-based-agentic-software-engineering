# Draining the sections into the views — the plan

**Goal.** Take the 6 book views from PoC/sample to **complete at paragraph granularity**, and emit the
rearrange/gap-fill worklist. "Drain a section" = walk it, deepen the outline to each paragraph's *canonical
point*, populate every view for it, and record the gaps. Guarded by the reverse-index + drift audit that
already landed (structural + freshness pre-commit lints; semantic = a review-gate agent audit).

## The unit of work — one section

For each of the ~139 sections (the `outcomes_model.py gaps` / outline worklist):

1. **Walk it** — read the section as written.
2. **Deepen the outline — canonical points, INDUCED not lifted.** For each paragraph, author its **canonical
   point** — *"if a machine wrote this, what's the sentence"* — the normalized statement of the idea, NOT the
   prose sentence (which carries segues/rhetoric). Record it as an inline **`<!-- point: <canonical> -->`
   decorator** above the paragraph. This makes the outline **model-from-decorator** (the model derives from
   the decorators; the prose is checked against them). Honesty rule: the point is a *faithful normalization*
   of what the paragraph ACTUALLY says — a paragraph with no clear point is a **gap**, not an invented point.
3. **Populate the views** for the section:
   - **Outline** — section + paragraph points (from the decorators).
   - **Outcomes** — the outcome(s) this section serves, as **primary** (chiefly delivered here) or
     **secondary/elaborative** (reinforced here); provenance derived / declared / gap-recommended.
   - **Conceptual** — concepts this section **defines** (`<!-- index-def -->`) vs merely **uses**; the
     chapter links it makes; the role of each float/table it carries.
   - **Cross-reference** — every `[ref:]`, chapter link, concept ref resolves (the reverse index covers it).
   - **Principle-weave** — which principle (if any) this section develops.
4. **Emit gaps** — the **union across views**: a paragraph with no clean canonical point; a section that is no
   outcome's primary; a promised concept never defined; a dangling reference; a thin thesis touch. Two
   paragraphs that induce the **same** canonical point = a **redundancy** (the machine version of the
   terseness audit — it would have caught the 3.1 triple-telling).

## Prerequisite (do first)

Add the **`<!-- point: <text> -->` directive**: a `MARKER_KEYWORDS` row in `build_book.py` + IR
classification in `book_ir.py` (a DIRECTIVE/arming marker, stripped from HTML — degradation-friendly, does
not leak, byte-identical build). Land it **after the Typst spike reports** (both read/edit `book_ir` /
`build_book`; avoid concurrent edits). Extend the reverse index + structural audit to cover the new
`point` symbol kind (it's an authored reference — the drift-prone kind).

## Roll-out — pilot, refine, then parallelize

1. **Pilot on ONE Part** (recommend **Part 1** — smallest, 2 chapters — or **Part 2**). Do the full per-section
   procedure by hand/one-agent. Land audit-only.
2. **Refine the plan** from what the pilot teaches: canonical-point *voice* (how terse/abstract), *granularity*
   (every paragraph, or only idea-bearing ones — skip pure segues/transitions), gap-precision, decorator
   ergonomics. Update this doc.
3. **Pilot again** on a second, different-shaped Part (e.g. a Part-3 model chapter — reference-style prose).
   Refine again.
4. **Scale: 3 parallel Opuses, disjoint per-chapter scopes.** Each drains its chapters end-to-end (decorators +
   views + gaps), commits local, does NOT push. **Concurrency discipline:** disjoint chapter *files* (no two
   Opuses in one `.md`); model-file writes serialize or partition by chapter (append-only per chapter, or each
   emits a per-chapter fragment merged after); the reverse-index/drift audit is the guardrail; run a
   `book-models` consolidation check afterward (did any re-implement `book_symbols`?).

## Honesty + provenance (non-negotiable)

- **Derived** = grounded in the prose as written (canonical point / primary outcome traceable to the text).
- **Declared** = a real point/outcome thin prose roughly supports, made explicit.
- **Gap-recommended** = the point/outcome a MISSING or inadequate unit *ought* to deliver — a recommendation
  for content that does not exist yet. Never let declared/gap masquerade as derived.
- The derived set = "what the book teaches as written"; declared + gap = the author's rearrange/fill worklist.

## Gates + discipline

- **Regenerate ALL derived artifacts before gating** — the three JSONs (`outline.json` / `outcomes.json` /
  `reverse_index.json` via their model scripts) AND `book-models/models-view.html` (via
  `render_models_view.py`) AND `outcomes-draft.md` (auto-emitted by `outcomes_model.py regenerate`). A stale
  `models-view.html` shows up as a THIRD `views-audit` "STALE" finding — easily mis-read as a new drain
  defect (Part-2b, 260731). The pre-commit hook re-renders `models-view.html`, but regenerate + stage it
  explicitly so the gate is clean before the hook runs.
- After each step: `catalog.py build` clean + **byte-identical HTML** (`git diff` on `book/*.html` empty —
  the decorators must strip cleanly), `catalog.py validate` 0, `catalog_tests.py --tier1` 0-failed,
  `catalog.py views-audit` exits 0. Keep all view checks **audit-only** during the drain.
- **Promotion:** once a view is drained to clean, flip its audit-only check to **blocking** (rule #55).
- Commit per section/chapter, co-author trailer, **do NOT push** (publish is the last step of the forward plan).

## After the drain

Rearrange content + fill the gaps (write the missing openers, define the promised concepts, add the
should-exist outcomes), then promote the view checks to blocking, then the semantic review-gate agent audit
runs over the `(point, paragraph)` pairs. Then: full Typst PDF (`book-typst.pdf`, local-only) → website sync
(site as a projection of the models) → publish.

## Pilot refinements (Part 1 drain, 260731 — `aa98ed5`)

The Part-1 pilot (21 points in 1.1, 12 in 1.2, byte-identical, gates green) taught four things every
subsequent Part-drain MUST honor:

1. **Occurrence-index hazard (byte-identity).** Decorator text is inert for the *rendered* HTML, but any scan
   over the raw `body_md` (e.g. the reader-facing occurrence index in `book-index.html`) will pick up terms
   that appear ONLY inside a `<!-- point: -->` decorator and spawn phantom references → byte-identity breaks.
   Fixed in the pilot via `_strip_point_decorators` before the occurrence scan. Any new reader-visible
   `body_md` scan must strip decorators first. This recurs on every Part.
2. **Chapter-opener points need a home.** A `point` above a paragraph that sits *before the first heading*
   belongs to no section; attach it at chapter scope (`OutlineChapter.preamble_points`), not to a section.
3. **Redundancy is two-tier.** Exact-slug duplicate points = a structural lint (`point_findings`, built).
   Semantic *near*-duplicates (e.g. 1.1's "first judgment" vs "first skill" both framing mode-selection as
   the primary judgment) are NOT slug-identical — they are a **review-gate/semantic** finding, surfaced in the
   gap report, not caught by the structural lint. Report near-dups explicitly.
4. **Blockquote-point convention (settled: YES).** A *substantive* set-apart blockquote carrying a real
   teaching claim GETS a point; a bare aphoristic epigraph whose idea is unpacked by the next paragraph does
   not (the next paragraph gets the point).

**Granularity rule (as applied):** one `point` above each *idea-bearing* prose paragraph (a claim the book
teaches). SKIP pure transitions/segues and pure figure-walkthroughs with no standalone claim.

**Blank-line rule (tightened by the Part-2a drain, 260731).** A blank line between a `point` decorator and an
adjacent marker is REQUIRED only before **block-heading notation** markers — `figure` / `label` / `>`
blockquote / `eq` / `noqa` (a glued one trips the "notation marker must head its block" build abort; 6.3
headshot incident). The **`index-def` / `index-example` / `gloss` family may sit flush** directly below the
`point` (matches the 1.1 exemplar; byte-identity holds) — this spares the reference-heavy Part-3 model
chapters (dense `index-def` runs) from over-inserting blank lines.

**Worked-example subsections inherit the parent's section-terms (settled).** A run of reference-style
subsections under one parent heading — a table/listing walk-through with no standalone teaching claim (e.g.
3.6's five "Worked join" H3s: "The three questions…", "The four models and their join keys", "The composite
picture", "The invariants the join spans", "The Selector and Scheduler in code") — carries NO points and NO
`section-terms` of its own; it inherits the parent section's `section-terms` marker. This is the granularity
rule applied at section scope: a subsection that is a figure/reference walk, not an idea-bearing section, is
not force-tagged. Do NOT read a bare worked-example subsection as a coverage gap.

**Honesty note (Part-2a).** A section whose opener is rhetorically self-undercutting can still be `derived`:
the test is whether the section *as a whole* states a faithful teaching, not whether its first sentence is a
clean topic sentence (2.3's "residual" — a soft opener is NOT "no teaching," so it does not force
gap-recommended).

## The CORRECTED point form — the reform the drain agents run (substrate landed 260731)

The first-pass points drifted into **verbose paragraph paraphrases** — a whole sentence-run restating the
prose. That is WRONG: a canonical point is a short *claim*, not a re-say. The corrected form (substrate now
built; see DESIGN.md §10) is what every reform agent authors from here. The `point-claim-word-cap` lint
reports the ~175 verbose points still to fix — that list IS the reform worklist. Drain each to the form below.

### The decorator grammar (3-segment point + section-terms)

```
<!-- point: <slug> | <claim> | terms: <t1>, <t2> -->
<!-- section-terms: <t1>, <t2> -->
```

1. **Point (paragraph, tier-2).** Three `|`-segments, the 3rd optional:
   - **`<slug>`** — the kebab id, unchanged. **Soft ≤6-word guideline (term slugs, not point slugs):** a
     new registered *term* / *concept* slug should read ≤6 words and drop a leading `the-`
     (`semantic-gap`, not `the-semantic-gap`; `model-zoo`, not `the-model-zoo`) — a short slug avoids
     colliding with a section-id / heading-anchor slug (which the reverse index namespaces by kind, but a
     distinct slug is cleaner) and keeps the vocabulary terse. This governs FUTURE drains; existing long
     slugs are not retro-renamed.
   - **`<claim>`** — a short **declarative sentence**, capped at **≤10 words** (the machine-checked rule:
     whitespace-separated tokens in the claim segment only). Write the irreducible claim, not a paraphrase.
     Example (the 2.2 demo): `A drift gate proves agreement, not correctness.` (6 words) — NOT the old
     40-word restatement.
   - **`terms:`** (optional) — the tier-2 **LOCAL** term slugs the paragraph deploys, comma-separated. Omit
     the whole segment when the paragraph names no fine-grained term; a 2-segment point still parses.
2. **Section-terms (section, tier-1).** Placed under the H2/H3, names the **1–3 major concepts** the section
   develops. One marker per section; keep it to 1–3 terms.

Both markers are INERT — invisible in the reader HTML, stripped byte-identically. Adding them to a section
must not change `book/*.html` (`git diff --stat book/*.html` empty after the build).

### The two-tier tagging procedure (per section the reform touches)

1. **Rewrite each point's claim to ≤10 words.** Run `python3 book-models/lint_point_claim_word_cap.py` — the
   section's points must drop off the finding list. The claim is the *induced* point (§honesty rules above),
   now terse.
2. **Tag the section's tier-1 terms.** Add one `<!-- section-terms: … -->` under the heading with the 1–3
   concepts it develops. Use **existing `- concept:` slugs** wherever they fit (they are section-tier by
   default — no registry edit needed).
3. **Tag each point's tier-2 terms.** Append `| terms: <t1>, <t2>` to points that deploy fine-grained
   concepts. A term may be a concept slug (section-tier, reused at paragraph granularity) OR a new local one.
4. **Register any NEW local term.** If a `terms:`/`section-terms:` slug is not a `- concept:` slug, add a
   `- term: <slug> | local` row under `## Term tiers` in `book/index-terms.md`. Run
   `python3 book-models/lint_term_tags_registered.py` — it must report clean for the section's terms. (The
   registry reuses `index-terms.md`; do NOT invent a parallel term file.)
5. **Regenerate + gate.** `python3 book-models/reverse_index.py regenerate` (captures the new term edges),
   `python3 book-models/outline_model.py regenerate` if points changed, then the standard gate: build
   byte-identical, `catalog.py validate` 0, `catalog_tests.py --tier1` 0-failed, `catalog.py views-audit`
   exit 0. Query a term's whole footprint with `reverse_index.py deps <term>` (which sections develop it ∪
   which paragraphs use it).

### Promotion (after the reform drains the seed)

Once every claim is ≤10 words and every tagged term is registered, a follow-up flips both lints to blocking
(`--strict`), the same drain-then-gate path the outline/outcomes checks take (rule-#55 discipline).
