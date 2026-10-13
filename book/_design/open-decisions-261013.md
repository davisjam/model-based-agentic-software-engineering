# Open decisions — MAGE book, as of 2026-10-13

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

## Also open, tracked elsewhere

- **Chapter 7** — deferred by your decision pending review of the settled chapter-5 account. The SEET
  "age of delegation" framing remains promising independently.
- **Chapters 1, 2, and 7 have had no prose audit.** The calibrated recipe exists
  (`prose-audit-recipe.md`, session scratchpad) and runs ~25–45 min per chapter. Chapter 7 has the
  strongest case: two findings already reach into it (the Zenseact dedup landed in `7.3`, and the
  companion-repository phrase now first appears at `4.4:155`).
- **Two in-flight branches** at the time of writing: `ch3-copyedit` (rounds 1–3) and
  `ch15-requirements` (the requirements relocation). Neither landed.
