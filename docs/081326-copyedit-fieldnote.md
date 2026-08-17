# Field note — Model-driven copyediting: how the declared models kept the 2nd-pass copyedit sound

**Date:** 2026-08-13 · **Context:** the MAGE book's 2nd-pass editorial campaign (front-matter + Parts I–VI theory rewrite around **Alignment ⊥ Modeling**, the constraint-not-time-accounting framing, the 4-step method, capital-that-depreciates, and the C/S/V/G contract), followed by the appendix passes (D "Operator's Reference," E "How to Write a Skill"). This note records *how the declared models were kept current through that copyedit, and the role they played in landing the copyediting soundly* — including the places where model **semantics** (not just wiring) had to change, and the misalignments we deliberately deferred.

All specifics below were verified against the live model files at the time of writing, not recalled.

---

## 1. How the models stay current

The book is **declared → generated**. Hand-authored `book-models/*.json` are the single sources of truth; every downstream view is regenerated from them at build in a fixed order (`chapter_identity → argument_spine → outcomes → chapter_shape → projections → claims → reverse_index (LAST) → metaphor_slogan`). The landing is likewise a projection of `landing-big-ideas.json` ("nothing on the landing's Big-Ideas argument is hand-authored in HTML").

The discipline that keeps map = territory:

- **Every assembler round ends by regenerating that cascade** off the edited declared sources. A copyedit that changes a chapter without updating the model it projects into fails at build.
- **The pre-commit hook + `catalog_tests` (`validate` 0, 52/0) block a commit** whose model and prose have drifted (AS5 / CS2 / CS5 / U3 / `check_big_ideas` / evidence-resolution / reachability joins).
- **The Final Opus DoD re-runs those joins at HEAD** (trust-nothing) before publish.

So the models don't get "updated" as a side chore — an edit that doesn't also satisfy the model's joins doesn't land.

## 2. The models turned risky copyedits into *checked* ones — three worked cases

**A. The landing is a projection, so figure/claim/home drift can't ship.** `check_big_ideas` joins `landing-big-ideas.json` four ways: every `book_home` resolves to a real chapter, every `figure` exists under `book/assets/`, every claim is within the word cap (≤26 words), every slot id resolves on the built page. When the blog-alignment copyedit repointed **retired** figures (`mage-churn-vs-compounding` → `reasoning-horizon`, `sdlc-to-selc` → `where-effort-moves`, `six-company-map` → `six-entry-points`, `determinization-frontier` → `open-frontiers`), the *figure-exists* join is what forced live assets instead of dangling ones; the word cap kept the claims tight; the `book_home` join mechanically enforced "site ⊆ book."

**B. A frozen-label surrogate key made a whole-Part reorder a one-field edit.** `chapter_identity_declared.json` is a list of `{label, filename}` rows; the **label** is the key that argument_spine / outcomes / chapter_shape / reverse_index all join on. The Part VI copyedit demanded a 3-chapter rotation. The assembler edited **only the `filename` field**, kept the labels frozen, and regenerated — result: `book/part6/` is now `6.3-mage-in-the-wild`, `6.4-reorganization-of-se`, `6.5-software-rejoins-engineering`, 0 dangling refs, AS5/CS2 green. Without the surrogate key that rename would have cascaded into every cross-reference in the book.

**C. A cross-model id-join kept a hypothesis renaming honest.** `theory_of_mage_declared.json` declares the hypothesis ids (`H1-failure-class-exposure … H8-learning-propagation`); `research_agenda_declared.json`'s `related_hypotheses[]` joins on them. The §6.6 copyedit introduced a *new named* H1–H8 set. Re-iding would have broken the join + reverse_index — so the assembler kept the ids as frozen join keys, re-stated the statements to the named set, and parked the risky split/mint as a documented `_note_r47_hypothesis_crosswalk`. Reader-facing prose became canonical while the blocking join stayed green.

## 3. Where the copyedit's *semantics* collided with model *content* (not just wiring)

The mechanical joins above only check that a pointer *resolves*. The harder cases were where the model's **meaning** was stale — the declared claim said the *old theory*. Because the declared claims *are* the theory, the theory copyedit forced reword of statement text, applied once at the model and inherited book-wide:

- **`argument_spine_declared.json` → `theses-treat-the-causes`** now reads: *"The theses are independent and address different problems: Modeling makes consequential knowledge explicit; Alignment gives obligations authority. Alignment can act without a model; MAGE places Modeling first…"* — replacing the old "causally linked, not parallel." Edited once (front-matter round); every later Part was told to **inherit, not re-reword** — that is the book-wide semantic-consistency rule in practice.
- **`claims_declared.json` + `definitions.json` (C/S/V/G):** "a sensor that **observes** it… **produces evidence, a validator judges it**" replaced "sensor **detects/catches** the violation." The role semantics changed, so the declared claim + glossary text changed. This is the *same class* as the website's alignment-principle card ("sensor catches the drift" → "produces evidence"), which `CC6` (card-claim-vs-model) then validated.
- **`universal-language` glossary term:** rendered text → "**common language of mature engineering**" across claims/outcomes/outline, with the **id frozen** (join preserved).

### A dedicated semantic-validity pass — because the join-gates can't see stale meaning
`MODEL-PROSE-AUDIT-PARTS-I-V-DRAFT.md` was a whole-book model↔prose audit precisely to catch what the mechanical gates cannot: a pointer that *resolves* but is *semantically stale*. It found, e.g., `landing-big-ideas.json modeling-principle.book_home` pointing at `reasoning-horizon`/1.3 after the prose moved to 2.1, and `outcomes_declared.json reasoning-horizon` describing sections that had been cut. These are invisible to a resolves-or-not check.

## 4. The honest nuance — some found misalignments were deferred, and one residual remains

Not every found misalignment was auto-fixed:

- **Regen-traps.** Several stale-model rows had a **hand-corrected card** on top. Blind regeneration would *revert the correct reader-facing fix*, so these are flagged as **author decisions**, not mechanically regenerated (the model is stale but auto-regen makes it worse). Example: `landing-big-ideas.json modeling-principle.book_home`.
- **Deferred hypothesis id split/mint** carried as a `_note` crosswalk rather than risk breaking the `research_agenda` join (see §2C).
- **Residual drift, recorded not yet reconciled:** `book/data/concepts.json` still reads "universal language" while claims/outcomes/outline carry "common language of mature engineering" — a known audit-only concept-card drift, queued in the post-publish sweep.

## 5. The general observation

The copyediting is "sound" **not because the prose was proofread carefully, but because each edit had to satisfy a join the model declares** — figures resolve, labels stay keys, ids stay ids, claims stay within the card. Where the collision was *semantic* rather than structural, soundness took two extra moves the gates don't automate: **reword the model's statement text** (once, inherited book-wide), and **run a dedicated model↔prose semantic pass** to catch resolved-but-stale meaning. And where a mechanical fix would fight a correct hand-edit, the right move was to **hold it explicitly** — a stale model row is safer flagged than clobbered by a regen.

This is the reusable lesson: a declared-model book gives you *mechanical* alignment for free (the joins), but *semantic* alignment through a theory change is still an editorial act — the models make it cheap to apply once and enforce everywhere, and make the residual misalignments explicit enough to defer on purpose rather than by accident.
