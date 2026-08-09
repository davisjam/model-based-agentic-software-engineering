# Connective-theses re-model — RATIFIED DECISIONS + Phase-1b REVISEs (2026-08-08)

Consumed alongside `PHASE-1-DESIGN.md` by every implementation phase. Where this file and the design
doc disagree, THIS FILE WINS (it carries the author's rulings + the Phase-1b reviewer's REVISEs).

## Author fork rulings

- **F1 — content boundary: BOTH bridge chapters → new Part 3 (Alignment).** (Author OVERRODE the
  synthesis + Phase-1b rec to keep semantic-gap as a Part-2 hinge.) Rationale: *The Agent Stack* is
  about WHERE the environment can intervene in the reasoning/action loop (soft conditioning, hard
  authority, feedback) — Alignment territory; *Models & the Semantic Gap* does the
  probabilistic-reasoning → mechanically-checkable bridge — also Alignment. **New Part 2 (Modeling)
  does NOT need them to motivate modeling — it opens on the cleaner knowledge-graph-first on-ramp**
  (part3-redux §3.1 "Context Is the First Modeling Problem"). So the swap moves the WHOLE current
  Part-2 block (incl. 2.1/2.2) into new Part 3; new Part 2 = the current Modeling material, opening on
  context→knowledge→model.
- **F2 — reframe depth: HEAVY Modeling (new Part 2) / LIGHT Alignment (new Part 3).** Ratified.
  Modeling gets the context→knowledge→model internal ascent + knowledge-graph-first + net-new
  galleries; Alignment is mostly interpretation + caption-reframes (content already strong + just got
  galleries).
- **F3 — "Model Zoo": keep the name; revise only the glossary definition** off "4+1 views over
  DocAble" → "views projected from one connected representation…". Do NOT rename the part.
- **F7 — relationship phrase: default "Modeling makes intent explicit; Alignment makes it binding"**
  (author may swap "binding" → "gives it authority"; both are the author's own words — low-stakes).

## Phase-1b verdict: RATIFY-WITH-REVISIONS (reviewer wins; ONE Epic, strict wave-gating)

Swap-is-nearly-free VERIFIED strongly (chapter_identity's own `_note` states the mechanism; spine
already orders modeling→alignment; `{{part:N}}` is Part-5-only). Riskiest phase = **P5 (Modeling
reframe + net-new galleries)**, NOT the swap. Fold these 5 REVISEs into P0/the design:

- **R1** — soften "nearly free": the **RENUMBER** is nearly free; the **REFRAME** touches ~13 files
  carrying meaning-laden literal "Part 2/3" prose that need by-MEANING re-pointing.
- **R2** — expand the P2 swap diff-audit canary beyond literal "Part N" to **semantic/ordinal
  cross-refs** ("next part", "earlier", "the following part", "the part before") that invert on swap
  but aren't grep-caught by a number scan.
- **R3** — make **"P2 frozen-green" a BLOCKING Wave-1 precondition**: foundations P0/P1/P3 close, then
  P2 swap lands + freezes green, BEFORE any content-reframe wave opens (avoids long draft-vs-main
  divergence).
- **R4** — scope the "In other words" lint to a **DECLARED ANCHOR SET** (the theses + a registered set
  of key theoretical statements), NOT a general "every new theoretical statement" trigger (general is
  editorial judgment, not mechanically decidable). Revise DoD-6 so it doesn't over-claim mechanical
  enforcement.
- **R5** — split **P5 into P5a (structural reframe:** context→knowledge→model ascent, is/ought spine,
  4+1-as-views) **vs P5b (net-new Modeling galleries:** higher-uncertainty, canary-unprovable — gets
  its own vision-review + author checkpoint).

## Wave-gating (Phase-1b): foundations before swap before content

Wave 0 (sequential): P0 lock canon → P1 figures + P3 ladder-SSOT (parallel) → **P2 swap ALONE, frozen
green** (R3). Wave 1 (parallel drafters into `book/_design/drafts/`, disjoint part dirs) → Wave 2
(sequential single-writer assembly, full gate between drains) → Wave 3 (appendices → terminology
sweep). New BLOCKING checks land AUDIT-ONLY-first (rule #55).

## EXECUTION PRINCIPLE (author directive 2026-08-08) — draft in parallel, linearize fast

**The linearization (single-live-writer assembly onto `main`) must NOT become a time disaster.** So:

1. **Author in parallel drafts, assemble by folding — never author during assembly.** Every content
   phase fans out MANY parallel drafters, each editing a COPY into `book/_design/drafts/` (disjoint
   part/section footprints, no commit). The sequential linearization step (the single writer that
   folds drafts onto `main` + gates each) does ZERO authoring — it swaps ready drafts in, runs the
   gate, commits. The slow serial resource is used only for folding, so wall-clock ≈ parallel-draft
   time + a fast fold pass, not sum-of-sequential-authoring. (This is exactly how the examples pass
   ran: drafters → assembler.)
2. **Drafts are HANDWRITTEN, not model-raw-emitted.** Hand-authored prose only — never a raw model
   dump / machine slop (the no-mechanical-prose rule). Each `### Example —` gloss, Takeaway, "In
   other words" line, ladder rung, figure caption is written by hand.
3. **Drafts are MODEL-SYNCED.** The prose projects from / stays consistent with the book-models it
   sits over (gallery rosters from `industry_cases_model`, rungs from the `capability_ladder` SSOT,
   the `feeds` edge / thesis definitions from `argument_spine`). This is WHY the models land first
   per phase (C-facet model-first sequencing) — the prose is drafted AGAINST the updated models, so
   the fold never has to reconcile prose-vs-model drift at linearization time.

Net: parallelize the expensive step (hand-authoring), serialize only the cheap step (fold+gate).
