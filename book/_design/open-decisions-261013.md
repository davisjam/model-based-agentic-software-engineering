# Open decisions — MAGE book, as of 2026-10-13

> ## RULED by the author, 2026-10-13 — all four decided
>
> **D1 — standardise on `enforcement`.** The distinction is substantive: enforcement is the mechanism
> that prevents a prohibited transition; consequence is what happens when a violation occurs. The five
> branches name missing engineering *capabilities*, and the figure already maps enforcement to a
> constraint or gate, consistent with the MAGE vocabulary. **Action:** change `consequence` →
> `enforcement` at `4.4:36`; preserve the figure and caption as they are.
> **Caveat to honour in prose:** enforcement need not mean absolute prevention. A gate can refuse an
> operation while other controls detect and respond. The surrounding prose must not imply every
> enforcement mechanism makes violations impossible.
>
> **D2 — SUPERSEDED, then re-ruled. Snapshots now; unification is a TODO.** The author's first
> instinct was labelling; on reflection: *"the right call is to go collect data so it's all up to
> date"* — **but not yet.** So: describe each figure as a dated snapshot with an identifiable
> observation window, and carry an explicit TODO to re-measure and unify later. Two standing
> requirements meanwhile: (1) every measurement states its observation window; (2) windows are never
> compared as though they measured the same activity. **One gap to close first:** the 32,039 figure
> needs its *actual cutoff* established, not a generic reference to "a history-mining pass."
> The build-versus-operation distinction stays — it is useful to chapter 5's argument that the factory
> does not stop working once the first operational version exists.
>
> **D3 — NARROWED. Three responsibilities, not seven checklist items.** The findings are legitimate but
> seven independent obligations would make the audit cumbersome. Consolidate:
> | Responsibility | Covers | Action |
> |---|---|---|
> | Terminological & semantic consistency | #1 synonym churn, #2 wrong-domain verbs | extend an existing pass |
> | Reader comprehension & exposition | #3 description-not-instruction, #4 caption duplication, #5 unintroduced referents | **add one book-prose interpretability pass** |
> | Mechanical consistency | #6 point-directive drift, #7 numeral aliases | add targeted checks |
>
> #5 is the genuine structural deficiency: a manuscript can have individually comprehensible sentences
> while assuming knowledge the reader was never given. The new pass should also ask whether the reader
> has enough context to understand a subsection's *purpose*, not merely whether its terms were
> introduced. **Keep it focused — no elaborate new taxonomy of prose defects.**
>
> **D4 — implement the render probe.** The whitelist verifies a construct is supported by the
> translator, not that its Typst translation is *valid* — which is exactly how an in-subset mapping
> shipped a latent break. The test compiles a minimal document containing **every** supported
> construct under the **pinned** renderer, including constructs the manuscript does not currently use;
> tests combinations only where translation is context-dependent; and runs in CI and whenever the
> pinned Typst version changes. The author: *"no reason to rely on human inspection when the relevant
> property is mechanically checkable."*
>
> **D5 — new, from the author's review of this memo: fix `land.py`'s gate omission.**
> `land.py` does not run `catalog_tests.py --tier1`, which is how the chapter-3 canon-pin regression
> passed the landing gates and was caught only at pre-push. **Correct the omission rather than
> continuing to rely on special-case instructions in briefs.**
>
> **Priority:** D1 and D4 immediate · D5 immediate (process defect) · D2 next chapter-5 cleanup ·
> D3 before the remaining chapter audits.
>
> **Standing caution from the author:** *"prioritize finishing the manuscript over further expanding
> its editing infrastructure… there is a danger that the process of improving the editing process
> becomes self-perpetuating."* D1/D2/D4/D5 have narrow objective completion criteria; D3 must stay
> bounded.


**Repo:** `talks-and-notes/governance-catalog` · **State:** `origin/main = a44037bcc`, tree clean,
0 unpushed. Chapters 4, 6, and 5 landed today through audit → diff → author review → corrections →
merged-tree gate → push, each CI-green.

**Purpose.** Three items were deliberately *not* decided during today's editing passes. Each is below
with evidence re-derivable from the tree, the options, and a recommendation. Written to be actionable
with no session context.

⚠️ **One claim in today's agent reports was wrong and is corrected in D1.** The chapter-4 copyedit
report stated that §3.4's caption says "enforcement" while *the SVG and chapter 4* say "consequence."
Measured directly, the SVG says **enforcement** — it agrees with the caption, and §4.4 is the lone
outlier. Acting on the report's framing would have edited the caption to match a figure that does not
say what was claimed.

⚠️ **Verification note.** Book prose is hard-wrapped, so a multi-word `grep -F` spanning a line break
returns nothing and reads as "missing." Probe with 3–5 word fragments or read the region. Scope counts
with `git ls-files`; a raw recursive `grep` under `book/` is dominated by `node_modules/`, `dist/`, and
`_typst/` noise.

---

## D1 — The governance-conversion taxonomy disagrees across three sites

**Status:** needs an author ruling. Smallest of the three, and the only one that reaches a published
course artifact.

### Evidence

The five-branch list of what a failure can reveal as missing appears in three places. Two agree; one
diverges.

| Site | Fifth branch |
|---|---|
| `book/part3/3.4-governance-conversion.md:85` (figure caption) | **enforcement** |
| `book/assets/governance-conversion.svg` (the figure's own labels) | **enforcement** |
| `book/part4/4.4-engineering-the-environment.md:36` | **consequence** |

Re-derive:

```
grep -n "evaluation, or" book/part3/3.4-governance-conversion.md
sed -n '36p' book/part4/4.4-engineering-the-environment.md
python3 -c "import re,pathlib;t=pathlib.Path('book/assets/governance-conversion.svg').read_text();print([re.sub(r'<[^>]+>','',m).strip() for m in re.findall(r'<text[^>]*>(.*?)</text>',t,re.S)])"
```

The SVG's full label sequence is: `FAILURE / SURPRISE` → `What was missing?` → representation,
obligation, evidence, evaluation, **enforcement** → model, invariant, sensor, validator,
constraint / gate → `DURABLE ENGINEERING STRUCTURE` → `FUTURE WORK BENEFITS FROM INHERITING IT` →
`ENGINEERING CAPITAL`.

### Why it matters beyond two files

The same SVG was copied into the course materials earlier today — it is now the figure in the 2-4
Failure-Aware lander (`course/lectures/act-2-delegation-and-control/04-failure-aware-engineering/figures/governance-conversion.svg`),
with alt text that names the five branches. So the wording propagates to a second surface, and the
lander's alt text will need to match whatever is chosen.

### The substantive question, not just the wording

These are not synonyms. **Enforcement** is a mechanism — the thing that refuses. **Consequence** is
what attaches to a violation. A missing *enforcement* and a missing *consequence* are different
diagnoses: the first says nothing refuses the violation, the second says the violation costs nothing.
Chapter 3's own four-way vocabulary (mechanism / control / constraint / sensor) makes "enforcement"
the mechanism-flavoured reading, which is consistent with the other four branches being
representation / obligation / evidence / evaluation — all capacities rather than outcomes.

### Options

1. **Standardise on `enforcement`** — change one word at `4.4:36`. Smallest edit; majority already
   agrees; keeps all five branches in the same register (capacities the environment can lack).
2. **Standardise on `consequence`** — change the caption *and* re-author the SVG *and* update the
   lander's copy and alt text. Four edits across two repos' worth of surface.
3. **Keep both deliberately** — only if they denote different things, in which case the figure needs
   six branches, not five. Most expensive and, on the reading above, probably not what is meant.

### Recommendation

**Option 1.** One word at `4.4:36`, and the register argument supports it independently of the
two-to-one count. If you prefer `consequence`, say so and the SVG + lander go in the same change
rather than drifting again.

---

## D2 — Three measurement vintages for the commit count

**Status:** you deferred this deliberately as a separate author-approved task, and framed the
resolution. Recorded here so the framing is not lost.

### Evidence — all three are real, and each is correct for its own window

| Figure | Where | Window |
|---|---|---|
| **23,215** commits / **20** weeks | `book/data/metrics.json` (`commits_total`, `study_weeks`) | measured 2026-08-03 at a named HEAD; 2026-03-12 → 2026-07-29 |
| **32,039** main commits | `book/part5/5.2-inside-docables-software-factory.md:974` | the history-mining pass's window |
| **34,218** commits / **29** full weeks | the live repository today | 2026-03-12 → 2026-10-13 |

Re-derive:

```
python3 -c "import json;d=json.load(open('book/data/metrics.json'));print(d['commits_total'],d['study_weeks'])"
grep -n '32,039' book/part5/5.2-inside-docables-software-factory.md
cd ../.. && git log --oneline | wc -l && git log --reverse --format=%cs | head -1 && git log -1 --format=%cs
```

`metrics.json` carries full provenance for its figures — measurement date, HEAD, window, and a
recorded correction of `commits_per_day` from 500 to 200. That discipline is why this is a labelling
problem rather than a correctness problem.

### What makes this load-bearing

`study_weeks` is a **denominator**. The same provenance note covers `commits_total`,
`commits_per_week`, `commits_per_day`, and `peak_week_commits`, and `catalog.py:323` consumes it. So
re-dating the window without re-running the histogram silently falsifies four published figures.

### Your framing, recorded

> There's no requirement that every measurement use the same observation window. There is a
> requirement that readers can understand why the numbers differ.

And the reason not to collapse them: **the 20-week build window is narratively load-bearest.**
Replacing it everywhere with 29 would erase the distinction between *constructing* DocAble and
*operating and extending* it.

### Options

1. **Label, don't recompute** (your stated preference). Each snapshot carries its date and scope at
   its site. Cheapest, preserves the build-versus-operation distinction, no derived figure moves.
2. **Re-measure everything at one HEAD.** One window, internally consistent, but requires re-running
   the histogram for `peak_week_commits` and loses the build-window distinction unless it is
   separately reintroduced.
3. **Hybrid** — keep the 20-week build figures as a dated snapshot, add a current-state figure
   alongside, and say explicitly what each measures.

### Recommendation

**Option 1**, as you framed it. Three sites need a scope clause: `metrics.json`'s provenance is
already adequate, `5.2:974` should name its window, and the prose at `5.2:12` / `5.2:281` already
got a bridging clause today explaining the 20-versus-29 pair. The work is small and well-specified.

---

## D3 — Seven proposed additions to the prose-audit playbook

**Status:** needs a decision on whether to land them, and one of the seven is structural rather than
a checklist item.

### Where these came from

Three chapter audits (3, 4, 5) each ended with a calibration section mapping the defects found to the
pass in `plugin/mage/skills/self-communicate/writing/audit.md` that would have caught them. Seven
defect classes were caught by **no pass**, each with drop-in wording in its report.

Reports: `ch3-density-audit-REPORT.md`, `ch4-density-audit-REPORT.md`, `ch5-density-audit-REPORT.md`
(session scratchpad; copy them somewhere durable if these are to be acted on later).

### The seven

| # | Defect class | Proposed home | Found by |
|---|---|---|---|
| 1 | **Synonym churn** — one referent under two or more names in a section | Pass 2 | ch4 |
| 2 | **Wrong-domain verb** — a concrete verb borrowed from another domain, importing an operation not meant ("*join* a representation to code") | Pass 2 | ch4 |
| 3 | **Description where an instruction belongs** — procedure-bearing prose answering *when/under what process* while the reader asks *what do I do* | Pass 3 | ch4 |
| 4 | **Caption-vs-prose duplication** — a caption repeating a mainline sentence instead of interpreting | Pass 4 | ch4 |
| 5 | **Unintroduced referent** — an acronym or named artifact whose first occurrence precedes its introduction | Pass 6, book mode | ch3 |
| 6 | **Point-directive / prose drift** — a `point:` directive's claim no longer appearing in the prose beneath it | Pass 4 | ch3 |
| 7 | **Numeral aliases** — a spelled-out English form of a tokenized or reconciled figure, invisible to a digit-grep | Pass 1 | ch5 |

### The structural one

**#5 is not a missing checklist item — it is a missing pass.** Pass 6 declares itself
catalogue-entries-only, so **book prose has no interpretability pass at all.** Both of chapter 3's
Tier-1 findings fell through that hole, and both reach past chapter 3:

- **"GEE"** appears at `3.1:119` as the acronym's **first occurrence in the entire book**, never
  expanded. "Governed Engineering Environment" is defined in `frontmatter/0.4` and `part1/1.1:66`;
  neither attaches the parenthetical. Part 4 then uses the bare token freely. *(A fix for this is in
  the pending `ch3-copyedit` branch — one parenthetical at `1.1:66`.)*
- **"the companion repository"** at `3.2:185` is the phrase's first mainline use, and the book nowhere
  tells the reader it has one. Recurs at `4.4:155`, also as-if-established. *(Flagged for the
  chapter-4 pass; not yet fixed.)*

Both fail the standalone-reader test the repo's own `CLAUDE.md` sets as its governing rule.

### Why #7 generalises past this book

The numeral-alias sweep is the most transferable of the seven. Two commits tokenized figures "so the
prose carries no raw digit," and both left a spelled-out alias behind that a digit-grep could not see —
"a hundred twenty-nine" beside a reconciled 130, and "fifty-eight" in the sentence immediately after
`{{refactor_files}}`. **Any repo that converts literals to tokens should sweep word-form aliases in the
same commit.**

### Options

1. **Land all seven.** Each has exact proposed wording. #5 becomes a new book-prose interpretability
   pass rather than a bullet.
2. **Land the mechanical ones only** (#5 detection, #6, #7) — the three that are greppable and so pay
   off without judgement — and leave #1–#4 as prose-judgement items for a human pass.
3. **Defer all.** The audits already found these by hand; the cost of not landing them is that the
   next chapter audit re-derives them.

### Recommendation

**Option 1, with #5 split out as its own change**, because adding a pass is a different kind of edit
from adding bullets to existing passes and deserves its own review. The other six are additive bullets
with supplied wording.

Note that landing these changes `audit.md`, which is a **skill resource**, not book content — so it
affects how every future chapter audit behaves. That is the point, and it is also why it is worth
reviewing rather than applying silently.

---

## D4 — The math subset's Typst mappings are not verified against the pinned renderer

**Status:** a real latent break, found at the end of the 261013 session. Needs a decision on whether
to add a guard; the instance itself is already fixed on a pending branch.

### What happened

Chapter 3 round 2 added set-difference and intersection notation. The gates went green —
`build_book.py` and `catalog.py validate` both passed — and round 2 was reported as clean. The math
**would not have rendered.**

`book/bookmath.py` holds a whitelist of supported constructs; anything *outside* it raises `MathError`
so a typo fails the build loudly. That guard works. The failure was one level in: `cap` was *inside*
the subset but mapped to the Typst symbol `sect`, which **Typst removed in ≥0.13**. The pinned renderer
is v0.15.1. So the build emitted plausible-looking Typst that the pinned version rejects.

Only compiling a chapter and looking at the output caught it — which happened because the author
asked for a rendered-figure inspection, a step rounds 1 and 2 had not performed.

### Current state — `main` is still carrying it

```
git show main:book/bookmath.py | grep '"cap"'          # → ("∩", "sect")   ← broken
git show ch3-copyedit:book/bookmath.py | grep '"cap"'  # → ("∩", "inter")  ← fixed
```

`main` has the stale mapping today. `setminus` and `varnothing` do not exist on `main` at all — round 2
added them. So the fix and the two new constructs all arrive together when `ch3-copyedit` lands; until
then, any `\cap` in book prose on `main` is a silent render failure waiting.

### Why the gates cannot see it

A wrong-but-well-formed mapping is indistinguishable from a right one until a renderer refuses it. The
whitelist checks *membership*, not *correspondence*. And the correspondence can rot without anyone
touching the book: a Typst upgrade renames a symbol and every mapping to the old name goes stale
silently. `sect → inter` is exactly that, already in the past.

### Options

1. **A render-probe test over the whole subset.** For each entry, emit a minimal document using it and
   compile with the pinned Typst; fail on any rejection. Catches this class completely, including
   future renames, and costs one short compile. Natural home is alongside the existing book gates.
2. **Pin-aware review only** — add a comment at the mapping table saying mappings must be re-checked on
   any Typst version bump, and rely on that. Free, and depends on nobody forgetting.
3. **Nothing.** Accept that new math constructs are validated by whoever first renders a chapter that
   uses them.

### Recommendation

**Option 1.** This is the audit-to-lint move the repo already applies elsewhere: the failure was found
by inspection, it is mechanically detectable, and the detection is cheap. It also generalises past this
instance — the whole subset gets checked against whatever Typst is pinned, so the next rename fails at
the gate rather than in a chapter nobody rendered.

Worth noting for the D3 decision: this is a *fourth* kind of gap alongside the seven audit-pass
additions, and it is the only one where the existing guard was present and still insufficient.

---

## In-flight state at time of writing (for whoever picks this up)

**Landed and pushed, CI-green:** chapters 4 (`1083651c1`), 6 (`9b4c88751`), 5 (`a44037bcc`). Each went
audit → diff → author review → corrections → merged-tree gate → push.

**Landed locally, push in progress:** chapter 3 rounds 1–3 (`bddc48cdf`) plus the §3.1 canon-shape
repair (`b5d5073d3`) and the two decision-doc commits. The pre-push gate passed 84/0; the transfer was
still running when this was written. Verify with `git log --oneline origin/main..HEAD` returning empty —
never the exit code.

**Branch awaiting a land, not a review:** `ch15-requirements` at `b8a6427ab` — chapters 1 and 5
(requirements relocation, format breadth, engineer's decision anatomies, 250 MB callback) plus the
author's five review edits, all applied and gated. The author approved it. It is blocked only on the
chapter-3 push finishing, because merging onto `main` mid-push can strand a commit here.

**Agents in flight:** `ch2-audit` and `ch6-audit`, each producing an audit report *and* a diff in one
run, in worktrees on disjoint parts. Chapter 2 had never been audited or edited; chapter 6 was edited
today but never audited, so its structural problems are already fixed and the audit is looking for what
a density pass finds that a structural edit did not.

**Next, and explicitly gated:** the author asked for a chapter-7 audit + diff **after** chapter 1/5
lands, because chapter 7's case-grounded theory should draw on the settled chapter-5 text. Do not
dispatch it before that merge.

**Two recurring substrate frictions worth knowing before touching `main`:**

1. **A pathspec commit on `main` orphans the pre-commit hook's own regeneration.** The hook rebuilds
   and force-stages `book-models/*`; a pathspec commit excludes anything it does not name, leaving
   `MM` entries whose worktree already matches HEAD. `land.py` then refuses on a dirty tree. This bit
   three times in one session. Habit: `git status` after every pathspec commit, unstage the stale
   index entries (`git reset -- book-models/`), and commit any genuine regen delta separately.
2. **`land.py`'s gate set does not include `catalog_tests.py --tier1`.** A chapter-3 round passed all
   five land gates while carrying a canon-pin regression, and only the pre-push gate caught it. If a
   copyedit touches a chapter that carries a canon shape — a bold-lead thesis plus an "In other words"
   restatement — run `--tier1` before landing, not after.

---

## Also open, tracked elsewhere

- **Chapter 7** — deferred by your decision pending review of the settled chapter-5 account. The SEET
  "age of delegation" framing remains promising independently.
- **Chapters 1, 2, and 7 have had no prose audit.** The calibrated recipe exists
  (`prose-audit-recipe.md`, session scratchpad) and runs ~25–45 min per chapter. Chapter 7 has the
  strongest case: two findings already reach into it (the Zenseact dedup landed in `7.3`, and the
  companion-repository phrase now first appears at `4.4:155`).
- **Two in-flight branches** at the time of writing: `ch3-copyedit` (rounds 1–3) and
  `ch15-requirements` (the requirements relocation). Neither landed.
