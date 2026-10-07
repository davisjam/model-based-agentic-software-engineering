# Open work items — 261006

Durable tracking for the author's outstanding asks. The orchestrator keeps this current; it is the
file to read first after an outage or a compaction. Items leave this list only when LANDED on main
and verified, not when an agent reports success.

## In flight

| # | Item | Branch | Notes |
|---|------|--------|-------|
| 1 | **Mermaid vs dagre A/B pilot** | `wb-mermaid-pilot-261006` | All three examples drawn both ways, HTML record pages, a recommendation. Both sides get real effort — a weak dagre rendering would rig the comparison. Author's bias is toward Mermaid; an evidenced negative result is still a win. |
| 2 | **Rebuild 2-3-Alignment.pptx** | `deck-2-3-rebuild-261006` | New causal spine: do the work → doubt the result → structure the delegation → model its failures → design controls → place them where knowledge exists → exploit explicit models → synthesize. ~33 slides, 5 sections, no Section 0. Roughly half the existing slides survive. |
| 3 | **Learn: conceptual opening** | `wb-learn-opening-261006` | A front-of-page contract before the lesson: what the Workbench is and is not, what it can model, what questions those models license, why little syntax is needed, where to graduate to. 500–700 words, cards not bullet lists. |
| 4 | **Richer state-machine notation** | `wb-machine-visual-261006` | Guards, effects and variables in the visual. The bound in `simple-worker-queue` is held by the arrival guard `occupancy < 4` and the picture shows none of it. Supersedes into item 1's outcome if Mermaid wins. |

## Pending — need a decision or a slot

| # | Item | Blocked on |
|---|------|-----------|
| 5 | **Workspace shows the system Scenario** | Nothing. The authored summary appears on the Start card then vanishes once an example loads. Part of item 4's brief. |
| 6 | **PROPERTIES reachable on the complex example** | Verification. Header counts 8 saved properties; the rail may push them below four join entries. Measure before changing. Part of item 4's brief. |
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
