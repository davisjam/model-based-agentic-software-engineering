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
