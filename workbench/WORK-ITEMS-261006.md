# Open work items — 261006

Durable tracking for the author's outstanding asks. The orchestrator keeps this current; it is the
file to read first after an outage or a compaction. Items leave this list only when LANDED on main
and verified, not when an agent reports success.

## In flight

| # | Item | Branch | Notes |
|---|------|--------|-------|
| ~~1~~ | ~~Mermaid vs dagre A/B pilot~~ | **LANDED** — see 'Settled' below. Pages at `pilot/index.html` + three `pilot/ab-*.html`. Follow-up taken: multi-line edge-label wrapping, `wb-edge-wrap-261006`. |
| 2 | **Rebuild 2-3-Alignment.pptx** | `deck-2-3-rebuild-261006` | New causal spine: do the work → doubt the result → structure the delegation → model its failures → design controls → place them where knowledge exists → exploit explicit models → synthesize. ~33 slides, 5 sections, no Section 0. Roughly half the existing slides survive. |
| ~~3~~ | ~~Learn: conceptual opening~~ | **LANDED**. Verified rendered, not from source: all five sections present, **587 words** (target 500–700), SysML and Clafer once each, no equivalence claims. Gates 1525/180/115. |
| ~~4~~ | ~~Richer state-machine notation~~ | **LANDED** `cabf0fe96` | UML `[guard] / effect` on transitions, variables compartment, key + twin parity. Verified live: guard, effect, both self-loops, `occupancy : integer [-1..5] = 2` all render. Gates 1521/180/115, all green. |

## Pending — need a decision or a slot

*(Items 7-9 RESOLVED 261007 by author ruling — see 'Curriculum canon' below.)*

| # | Item | Blocked on |
|---|------|-----------|
| ~~5~~ | ~~Workspace shows the system Scenario~~ | **LANDED** with item 4. Verified on the live page. |
| ~~6~~ | ~~PROPERTIES reachable on the complex example~~ | **LANDED** with item 4 — Properties reachable from the rail top. |
| 7 | **Curriculum drift: Alignment is one lecture or two?** | AUTHOR. The mirror now lists one; `03-alignment/index.md` declares two sessions and `reference-course/calendar.md` schedules "Governing Realization" in week 8. Collapsing frees a week-8 slot — a schedule change, not a listing change. |
| 8 | **Modeling subtitles disagree with the unit** | AUTHOR. Mirror says *Representation & Implementation* / *Engineering with Models*; the unit declares *Purposeful Reduction* / *Degrees of Semantic Commitment*. |
| 9 | **Three Modeling decks for two declared sessions** | AUTHOR. `Purposeful-Reduction`, `Degrees-of-Semantic-Commitment`, `Systems-of-Models` — the last two both numbered `2-2-Modeling-2-`. Plus a stray `copy.pptx`. |
| 10 | **Push the banked commits** | Agents quiescing. Main holds ~22 unpushed; push gate contends with fleet load, so order the push after the wave, never during. |

## Standing hazards this session established

- **An agent holding many files uncommitted is the largest recoverable loss here.** An outage cost
  one agent 68 files. Brief long agents to commit per logical group.
- **A stale branch over a BINARY is a revert by default** — diff the file's history on main first;
  a near-identical subject line is the trap, not the reassurance.
- **`fatal: Unable to write index`** = stale `index.lock`, and this repo is a submodule so `.git` is
  a FILE; resolve the real gitdir with `git rev-parse --git-dir` before hunting disk or permissions.
- **The failures that cost most today were in MEASUREMENT, not in the thing measured** — a focus
  ring that was painted, a reflow probe blind to text ink, a sub-pixel assertion encoding a rounding
  rule Chromium lacks, and a test file that stopped running entirely and reported nothing. A probe
  must assert its own preconditions.

## Settled 261006 — the renderer question

**Keep dagre + our painter; adopt UML's notation.** Measured, not argued: the simple-worker-queue
machine rendered through the vendored Mermaid 11.16.0 **drops one of the two parallel self-loops** —
`processing` renders, `arrival` is absent entirely, one path emitted where two belong. A renderer
that silently discards a transition shows a model that is not the model. Mermaid also attaches no
semantics to the `event [guard] / effect` label (it is a string) and its accessibility surface is a
bare `role="graphics-document"`, nothing like the twin built from the scene. Layout would not
improve either: `layout-dagre.ts` is the same Sugiyama engine Mermaid's own state layouts use.

Record: `workbench/DECISIONS-RULED-renderer-genre-261006.md`. A dedicated A/B pilot across all three
examples is still running as an independent check on that disqualifying finding.

## Curriculum canon — RULED 261007

The author's rulings, and what each cost to apply:

- **Alignment is ONE lecture.** The unit now OMITS `sessions:` entirely — the parity gate taught
  that, rejecting a one-item list with *"a single-session module omits the key"*. Week 8 of
  `reference-course/calendar.md` carries Failure-Aware Engineering alone. `materials:` points at
  `2-3-Alignment.pptx`, which exists, instead of promising it as forthcoming.
- **Modeling canon: *Purposeful Reduction* and *Degrees of Semantic Commitment*.** The mirror, the
  act index and `README.md`'s worked example had been advertising *Representation & Implementation*
  and *Engineering with Models*, which named no deck and no declared session.
- **Filenames carry the canon, so those are the right decks.** `2-2-Modeling-2-Systems-of-Models`
  (241 KB, 30 September, referenced only from a scratchpad note) is `git rm`'d and recoverable from
  history; the untracked Finder duplicate of Purposeful-Reduction is gone.

**The consequence neither of us named:** declaring one session re-measured the lander against a
tighter prose band. `03-alignment/index.md` was **1625 words against a 750–1000 one-session band** —
it had been written to carry two sessions. Trimming it is the last open piece. The schema caught a
downstream effect of a scheduling decision, which is the governance working as designed.

## 261007 — Act II writing complete; both CI failures were ours

**Landed and published (origin):** the 39-slide 2-3-Alignment deck across five passes (causal spine,
chapter figures adopted on slides 19/24/33, prune 39→37, copyedit + 37 speaker notes, Master Equation
bookend back to 39); the Alignment lander at ~953 words defining Alignment independent of its
mechanisms; the curriculum canon (Alignment = ONE lecture, Modeling canon names, two non-canon decks
retired); the Master Equation recurring device across the Act II intro + all four unit landers; the
chapter 6 reopener. **Landed, push in gate:** the chapter 6 copyedit (ch6-9.md, −149/+182 across
`book/part6/*.md`) and the Act II landers structural copyedit (5 files).

**Artifacts rebuilt + verified:** book PDF **489pp** (was 490 — the ch6 reduction), every BLOCKING
layout sensor green; book ePub 2.0 MB; handbook PDF + ePub + per-chapter PDFs; stapled landers
(14 landers, 4 Master Equation headings, 0 "governing" leftovers). All gitignored — CI rebuilds them.

### Both CI failures were self-inflicted, from the SAME decision

CI was red from 00:07 through the afternoon. Both causes traced to the Mermaid A/B pilot pages —
hand-rolled HTML published into a site whose quality strategy assumes every page comes from a
renderer template:

- **site-gates** → `html-validate` `prefer-tbody`: `pilot/index.html` had `<tr>` outside `<tbody>`.
  **This check had NEVER run locally** — it SKIPS when `npx` is off PATH, which it is unless nvm has
  been sourced, so a local `--full` reported it *skipped* and the summary line read clean.
- **browser-tiers** → the sub-pixel reflow self-test. It pinned a MEASURED engine constant (document
  `scrollWidth` flips at +0.75px overhang) and probed 0.15px inside it. The boundary moved to
  **+0.5px**, so the probe flipped. It now DERIVES the boundary per run and fails loudly if the sweep
  finds none.

### The reproduction lesson

Local runs passed 115/115 all day. **The CI STEP does three things `npm run test:a11y` does not** —
sets three receipt paths, clears them, and asserts each is non-empty afterwards. Running with those
set is what surfaced the failure locally. Reproduce the STEP, not the test.

### Faithfulness gaps found (the author's standing question)

1. `--full` Tier-2 never runs pre-push.
2. `html-validate` silently SKIPS without nvm-sourced `npx` — a skip reads like a pass at a glance.
3. mkdocs was declared in `site/requirements.txt` but never installed, so the teach site could not be
   built locally at all. Installed in a venv (`/tmp/gcvenv`); PEP 668 blocks the system Python.
4. Workbench gates are conditional on a `workbench/` path in the push, so course-only pushes skip them.

### Open, waiting on the author

- **Chapter 6 redirected a cross-reference** from §7.3 to §6.3 following the guidance; §7.3 is the
  chapter actually titled *Agentic Engineering Beyond Software*. One-line revert if the guidance slipped.
- **2-3's table is 3 rows where 2-2's and 2-4's are 4**, breaking the device's row rhyme at Alignment.
  Agent followed the explicit reason (H is not in the displayed equation); 2-4's "Surrounding process
  *H*" row would honor both.
- Chapter 6 reduction is **−3.6%, not the expected 8–12%** — §6.3/§6.4 grew where the guidance added
  conditions and questions. Hitting the number means cutting §6.2's framing paragraphs.

**Fable quota was exhausted mid-afternoon** (now uncapped again); two copyedit agents died before
writing anything and were re-dispatched on Opus. A third died one step before committing with verified
work in the tree — recovered by running the gates and committing on its behalf. That is twice today.

### 261007 late — four surgical lander copyedits (committed, branch `landers-surgical-261007`)

Author's final pass on the Act II landers. Each keeps a factor to its own link in the chain:

1. Delegation — "two parts of this system" named three units; now "examine this system from three
   directions."
2. Modeling P(L | I,E,R) — asked whether the REPRESENTATION preserves enough structure, but by that
   stage the representation's work is done through encoding and interpretation. Now asks whether
   enough consequential structure has been preserved.
3. Alignment P(E | R) — "clearly enough to evaluate" borrowed evaluation from the surrounding control
   system before it exists. Now "represented clearly enough to be encoded as intended."
4. Failure-Aware close — "giving selected obligations authority beyond the producer's judgment" →
   "backing selected obligations with controls outside the producer's judgment", which is Alignment's
   own concrete vocabulary.

The recurring cue ("The Master Equation separates places where reliable delegated realization can
fail.") verified identical in all four landers after the edits.

**Committed in a WORKTREE, not on main, deliberately**: a push was mid-gate, and committing to main
while a push transfers stranded a commit earlier today. Merge after the push lands.

**Standing worktree gotcha, seen three times today:** `catalog_tests.py --tier1` reports 2 failures
in any fresh worktree — `html: link + anchor resolution` and `book: emitted web tree == expected page
slugs` — both from `book/web/docs/` being empty. That tree is gitignored and only exists in the main
checkout. Not a regression; do not chase it.
