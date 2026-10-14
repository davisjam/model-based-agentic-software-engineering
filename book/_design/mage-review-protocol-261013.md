# The MAGE review protocol

**Status:** formalized 2026-10-13 from the author's reconstruction of August–October practice, plus
what the day's seven landed chapter edits show the procedure actually was. Durable by design — an
earlier version of this recipe lived in a session scratchpad and was lost to a crash. **Process
knowledge goes in the repo.**

---

## The governing distinction: two review modes

Confusing these produces endless revision. The author's stopping rule:

| Mode | Question | When |
|---|---|---|
| **Developmental review** | Is this the right material, in the right order, explained the right way? | While structure is unsettled |
| **Landing review** | Did the proposed edits improve the manuscript without damaging anything? | Once structure is settled |

**Applying developmental standards to every copyedit creates unnecessary churn.** A landing review does
not reopen settled conceptual decisions unless the revision exposes a genuine problem.

---

## The five passes

### Pass 1 — Intellectual and structural

Read the whole chapter as a continuous argument, not a collection of independently reasonable sections.
Evaluate: intellectual contribution (is the central engineering insight identifiable and developed?),
organization, conceptual progression (**intuition before formalism**), completeness, redundancy, and
relationship to the rest of the book.

**This pass precedes copyediting. Do not polish paragraphs that may later be moved or removed.**

Output: overall verdict, structural recommendations, prioritized changes.

### Pass 2 — Pedagogical and narrative

Read at section, subsection, and paragraph level. Evaluate motivation, topic sentences, explanation
before use, whether examples *clarify* abstractions rather than merely illustrate terminology,
transitions, whether figures make something easier to understand or merely repeat the prose, and
pacing.

**Progressive density:** a chapter should become more technically demanding as it establishes the
conceptual foundations that demand requires.

Output: editorial guidance by section — what needs restructuring, expansion, compression, relocation.

### Pass 3 — Prose and style

Only once structure is stable, and **restrained**. Recurring targets: excessive abstraction, repeated
explanation, formulaic constructions and artificial rhetorical symmetry, unnecessary terminology or
premature formalization, weak topic sentences, claims stronger than the evidence, and long passages
expressible more simply without losing precision.

**Preserve strong existing prose. Do not replace distinctive language with generic textbook prose for
consistency's sake. The objective is clarity and economy, not maximal compression.**

The agent-facing detail lives in `plugin/mage/skills/self-communicate/writing/audit.md` — the nine
defect patterns, the pass structure, the prioritization and output spec.

### Pass 4 — Technical and conceptual consistency

Check terminology against the book's vocabulary; definitions against their formal uses; examples
against the mechanisms they claim to demonstrate; claims against evidence and citations; figures
against surrounding explanation; consistency with earlier chapters. **And confirm the revision has not
weakened the central arguments** about Modeling, Alignment, degrees of freedom, engineering judgment,
and control.

### Pass 5 — Diff review and landing

For each proposed revision: **inspect the actual diff, not the editing agent's report.** Then: was the
stated objective achieved; was useful material accidentally removed; did technical meaning change; was
repetition, awkwardness, or terminology newly introduced; which corrections are necessary versus
stylistic preference.

Verdict: **Land / Land with specific corrections / Revise / Reject.** Where corrections are needed,
give precise replacement language or narrowly scoped instructions.

---

## Three principles

1. **Editorial intervention should diminish as the manuscript stabilizes.** Early reviews may consider
   structural reconstruction; later ones concern local clarity, consistency, and polish.
2. **Do not manufacture problems.** A passage need not be rewritten because another formulation is
   possible. The test is whether the change materially improves the reader's understanding.
3. **The book should sound like an engineering textbook, not an LLM-generated manifesto.** Precision
   and accessible explanation matter more than memorable phrasing. *"Derive force from the engineering
   argument, not from dramatic phrasing."*

---

## What the landed edits actually looked like

Seven chapter edits landed on 2026-10-13. Their measured shape, as a calibration baseline:

| Chapter | Diff | Words | Character |
|---|---|---|---|
| 4 | 5 files, 57+/48− | **−265** | subtractive copyedit |
| 6 | 4 files, 150+/175− | **−104** | structural + topic sentences |
| 5 | 4 files, 26+/32− | **−141** | correctness only, scoped deliberately |
| 3 | 9 files, 256+/39− | **+1,830** then **−223** | author-authorized additions, then consolidation |
| 1 & 5 | 2 files, 74+/36− | **+672** | relocation + authorized new material |

**Three subtractive, two additive — and both additive passes were author-authorized new content, not
drift.** A pass that grows a chapter without a prior authorization is the signal to stop and ask.

### The corrections the author actually made, by frequency

This is the empirical core. Across five chapters the same seven corrections recurred:

1. **Metatextual openings — by far the most frequent.** A paragraph that begins by describing the
   argument instead of making it. *"The previous propositions explain…"*, *"The progression of Chapter 3
   has been escalating…"*, *"The grouping establishes the nature of the problem…"*, *"the chapter's
   stronger claim is…"*, *"My role was concentrated elsewhere…"*. **Begin with the substantive claim.**
2. **Over-compression.** An edit that collapses three claims into one clause, or a callback so tight the
   new argument competes with the recap.
3. **Lost hedges.** A modal removed from a claim the book has not established. *"should produce"* was
   restored deliberately: this is a theory, not a law.
4. **Dramatic phrasing.** Rejected as *"too visceral for an engineering textbook"* — and the replacement
   was more precise, not merely calmer, because it named the competing requirement.
5. **Normative framing in a descriptive artifact.** A figure caption calling an excluded region
   "needlessly lost" when the prose explicitly allows justified exclusion. Captions describe; prose
   judges.
6. **Over-disclosure of work in progress.** A methodological aside about records not kept. *"The kimono
   does not need to be that open on WIP stuff."* Be accurate without turning a passage into a
   completeness report.
7. **A redundant tail after a strengthened topic sentence.** The most instructive one: fixing the
   opening often makes the next two sentences redundant, and an agent that improves the sentence
   frequently leaves the material it displaced.

---

## Orchestration: how a chapter actually moves

```
audit (read-only, report → REPO)
  → orchestrator brief (verify every premise against CODE at the base sha)
  → agent produces diff + editorial report, commits to its own branch
  → AUTHOR REVIEWS THE DIFF
  → orchestrator applies corrections verbatim, re-gates
  → land.py on the MERGED tree
  → push, verify by content, watch CI to conclusion
```

Non-negotiables learned the hard way:

- **Artifacts go in the repo, never the session scratchpad.** Two crashes destroyed two completed audit
  reports, a calibrated recipe, a shared brief, and one chapter's in-progress diff. Everything
  committed survived; everything in the scratchpad is gone.
  - **But `.scratch/` is PER-WORKTREE, so a brief must name the deliverable's ABSOLUTE path.** The
    in-repo scratchpad fixed crash survival and introduced a second problem the same day: an agent
    told to "write to `.scratch/`" writes to *its own worktree's* `.scratch/`, which is a different
    directory from the one the orchestrator is watching. The ch6-progression pass delivered correctly
    and its files read as missing — the orchestrator had already told the author a path that held
    nothing. Nothing was lost, but the next instance looks exactly like an agent that produced
    nothing, which is the costly direction of error. So: give the deliverable path as
    `<main-checkout>/.scratch/<name>` explicitly, and keep only in-progress drafts worktree-local.
- **An agent commits as its LAST action.** Work only in a working tree is banked nothing.
- **Read the report body, never the final message.** A finished agent re-emits its previous frame —
  several returned "no action taken" having done the whole job.
- **Verify a merge on the merged tree**, via `tools/land.py`, never on the branch.
- **Verify a push by content** — `git log origin/main..HEAD` returning empty. Never by exit code.
- **One writer on `main`; every agent gets a worktree.** Pathspec-commit, and expect the pre-commit
  hook's regenerated `book-models/*` to be orphaned by it — check `git status` before the next land.

### The mechanical pre-pass (cheap, run before reading prose)

**Every check below is a DETECTOR, not a definition of good prose.** A count over threshold locates a
passage to read; the reading decides. The author's standing caution, recorded after the chapter-1 and
chapter-2 reviews: do not turn corrective-figure counts or duplicate-n-gram hits into hard stylistic
rules. Both reviews protected repetition that a threshold would have flagged — a principle restated
across a long technical chapter, and a five-item vocabulary repeated across two sections precisely to
establish a correspondence. *"This is precisely the kind of repetition that a mechanical style pass
might remove incorrectly."*

1. Em-dash density per file; flag > 1 per 50 words.
2. Corrective-figure census — *"X is not A. It is B."* and *"not merely/simply"*. More than ~3 per
   chapter is a finding, and the grep hits are the fix list.
3. **Duplicate n-grams across `book/part*/` only** — the single highest-yield check across four audits.
   Restrict the scope: `dist/`, `web/docs/`, and `_design/drafts/` are generated or stale and drown it.
4. **Numeral aliases** — for every tokenized or reconciled figure, grep its *spelled-out* form, in prose
   **and** point comments and captions. A digit-grep cannot see "a hundred twenty-nine".
5. **Unintroduced referents** — every acronym and named artifact, earliest occurrence versus definition
   site.
6. Literal `§N.N` refs (every cross-reference should be a macro) and 4+ significant figures beside
   "about/roughly/estimated".
7. Point-directive drift — does each directive's claim still appear in the prose beneath it?

### Join hazards that bite silently

- **`point:` slugs are join keys** in `book-models/`. Keep the slug; rewrite only the summary.
- **`figure-caption-tiers.json` is keyed on `chapter::caption-title`** — retitling a caption *forces* a
  registry edit. Two independent agents hit this hours apart.
- **The math subset is only validated at render time.** An in-subset construct can map to a symbol the
  pinned Typst removed. `check_bookmath_typst_mappings` now closes this.
- **`catalog_tests.py --tier1` holds the canon pins** and is the only content-reading gate. A copyedit
  collapsed a two-part canon shape and passed five landing gates; tier1 caught it. It is now `land.py`'s
  third gate.

### Verification discipline

Book prose is **hard-wrapped** — a multi-word `grep -F` spanning a line break returns nothing and reads
as "missing". Probe with 3–5 word fragments or read the region. **Assert an extraction is non-empty
before concluding from a grep over it**: an empty result is the expected output of looking in the wrong
place, and that error condemns working prose.

---

## Standardized output

| Component | Expected |
|---|---|
| Overall assessment | Is the chapter intellectually and editorially sound? |
| Structural | Organization, progression, missing material |
| Pedagogical | Motivation, explanations, examples, figures |
| Prose | Density, repetition, clarity, voice |
| Technical | Precision, consistency, evidence |
| Priority edits | ~5–15 changes, ranked |
| Verdict | Ready · copyedit · structural revision · land |

For a **landing review**, replace the broad assessment with a focused evaluation of changes,
regressions, and whether to land.

**Mandatory in every editorial report: a deliberate-exceptions section.** Findings declined, with
reasons. Across seven landed edits these were as valuable as the edits — they caught an audit proposing
to cut a canonical five-noun taxonomy, a bullet conversion that would have traded register for a
threshold, and a rewrite that silently dropped one of four terms.
