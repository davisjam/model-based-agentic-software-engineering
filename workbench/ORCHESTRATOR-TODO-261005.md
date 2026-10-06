# Orchestrator TODO — session 261005

Written because this session is driving six concurrent waves across four surfaces (workbench, Learn,
two decks, the book) and the state no longer fits in a message. Facts below are **measured**, not
recalled; each line says how it was checked. `main` is local-ahead of `origin` — nothing here has
been published yet.

**Standing instruction from the author:** *"Push through on all requests. Publish when done. Do not
stop."*

---

## LANDED AND PUBLISHED — 261006

`origin/main` is **`6afe9ad2c`**, verified by content (`git log --oneline origin/main..HEAD` empty),
across two publishes totalling 26 commits. CI on the first tip (`d7904b207`) concluded **build
success, deploy success**; the run for the final tip was still in flight when this was written —
check it before trusting the site.

T1 through T7 are **done**: the liveness-sweep third state (which turned `main` green), the
browser+a11y tiers in pre-push, the Alignment deck, the shadow-types design, the example cases, the
merged-tree verification, and both publishes.

**Merged-tree verification, the gate that mattered** — five waves landed together, and branches cut
hours apart are each green against a different `main`:

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| node tier | 1441 / 1441, 0 fail |
| browser tier | 166 pass, 0 fail, 1 deliberate todo |
| a11y tier | 113 / 113, three receipts written |
| `catalog.py validate` | 85 entries, 0 issues |

Two reds surfaced during that verification and both were controls working rather than defects: the
semantic-live gate went red on its own stale pin once the corrections landed (resolved with a third
`REFUSED` verdict state rather than a deletion), and the browser harness refused to run against a
stale `dist/workbench.js` after `src/ir/hash.ts` changed — reporting staleness instead of three
phantom product failures.

All eight wave worktrees were removed after confirming zero unmerged commits each; branch refs are
kept as the audit trail.

---

## Awaiting the author — do not guess these

1. **D7 / shadow types.** Ruled mandatory-with-shadow-types; design in flight (A3). The open
   objection, measured: use-based unification catches *incoherence across uses*, not nonsense —
   `calls` has a single edge in the flagship `message-bus`, and a single-edge relation type gets no
   constraint from use at all. Verified by injection that a payload field publishing a payload field
   loads clean at HEAD. A3 must resolve this without over-claiming the guarantee.
2. **The Alignment unit's session structure.** The lander declares two sessions and splits its
   readings across them, with §3.4 governance conversion assigned for Lecture 2; the author's
   guidance describes one 75-minute lecture. The two ratified changes (opening reframing, deleting
   the three governance-conversion items) are done; collapsing the unit would cascade into the
   reading split and the `materials:` entries, so it was deliberately left alone.
3. **Truth gate, five open questions** — in `/tmp/truth-gate-design-261005.md` §10. Not yet folded
   into the repo; it belongs in `workbench/` beside its siblings.
4. ~~**`wb-edit2a-261003`**~~ — **RECOVERED AND LANDED 261006.** Of the 74 branches the crashed
   session left behind, 73 were fully landed by patch-id and this one held 2 unlanded commits. It
   was 62 lines of §9c.1 in `DESIGN-shell-261002.md`: the measured cost of wave 2a to the D-2
   focus-order pin, and why the two land orders are asymmetric for the gate. A measurement, which
   does not go stale the way a claim about current code does. The merge conflicted additively —
   both sides had appended a section at the same point — and both survive in numerical order.

---

## Known debt, named rather than silently carried

- ~~The Truth-gate design lives in `/tmp`.~~ **DISCHARGED 261006** — folded to
  `workbench/DESIGN-truth-gate-261005.md`, unmodified, beside the two gates it shaped.
- **Two addressing schemes are not unified.** The gates wave's `subject:` is a single locator string
  at family granularity; the Truth design's `subjects:` is structured and names individual relations
  by id. The locator builders are exported so the Truth phase joins rather than re-derives, but the
  unification is unfinished and belongs to that phase.
- **The `held_by` chip has no renderer.** The gates wave declared it a follow-up rather than
  half-building it, which was the right call; epistemic-boundary supplies the verified data and no
  surface displays it yet.
- **Deck 2-2-2 has ~17 text overflows.** The AUTHOR is handling these himself and agents are
  instructed not to touch them.
- **My own error, recorded so it is not repeated.** The section-breaks agent was handed the copyedit
  spec and its closing line read *"Task complete. Orchestrator-scoped hook; no action."* I read that
  terse line as a no-op and dispatched a second agent, which raced it on the same `.pptx`. The second
  agent's all-MISS failsafe caught it and wrote nothing, so no work was lost — but the cause was the
  orchestrator inferring an outcome from a fragment of a report instead of reading the file, which is
  precisely what this repo's `CLAUDE.md` warns against. The CLAUDE.md bullet I then wrote blamed the
  resume mechanism; the resume worked and the *report* was the problem. That bullet needs correcting.

---

## T8 — Composition must be VISIBLE in the Workbench (author request, 261005)

**Ratified requirement:** *"Whenever a property depends on more than one model, Workbench must expose
the composition that licenses the inference"* — and *"It should expose them in part via a visual."*

### The defect, as the author found it
`worker-queue` reports ESTABLISHED for *"The job is never in processing while no worker holds its
lease."* That conclusion plainly draws on both `job-lifecycle` and `job-lease`. But the UI
**positively encourages the reading that the models are independent**: each asks its own question,
each gets its own machine diagram, the Navigate rail lists them as peers, and nothing on either
diagram says their states participate in a common configuration. The collapsed "Status, grounding
and evidence" may expose the join when expanded — but that is provenance after the fact, not
composition as part of the model presentation. If it does not, the join is invisible.

**Why this one matters more than an ordinary UX gap:** deck 2-2-2 now teaches "Some questions cross
models." A workbench that answers a cross-model question while hiding the composition conceals the
most interesting thing happening, in the exact week the course starts claiming students should see
it.

### The three moments that should expose composition
Normal browsing keeps the clean one-model view. Composition surfaces at:

1. **Select a cross-model property → a COMPOSED view.** Two purposeful models side by side, the
   BINDING that establishes they concern the same job, and the particular cross-model constraint
   being checked (`job-lifecycle.state = processing ⇒ job-lease.state ≠ free`). The author is
   explicit that *"the important visual object is that middle binding/join, not merely drawing the
   two machines beside one another."*
2. **Select or click a binding** → show the models it connects and what identity or semantic
   correspondence it asserts. Clicking through should land on the declaration that establishes the
   two machine instances describe the same job.
3. **System overview → the MODEL-COMPOSITION GRAPH, not an entity graph.** The Navigate rail today
   reads as a flat list of three models. It could read as topology:
   `Worker Pool ──worker── Job Lease ──job── Job Lifecycle`. The models stay purposeful reductions;
   students see where their meanings meet. With three models this is where the pedagogy pays off.

### Naming
**Do not call it JOIN in the UI.** The author: label the binding with the actual model semantics,
not generic database terminology — "shared identity: job", "bound on: job", or whatever the engine's
own construct is called. Find what the engine actually names it before inventing a label.

### Dependencies and sequencing
- Related to, but distinct from, T5/shadow types: that work is about what the type layer PERMITS;
  this is about what the UI SHOWS. They touch the same composition semantics from opposite ends and
  should be read together before either is built.
- Touches the workspace's central view and the Navigate rail, so it will collide with any wave in
  `src/ui/`. Sequence after the example-cases wave lands (it adds a persistent case panel to the
  same region).
- Reaches the page: browser + a11y tiers mandatory. A new composed view needs landmark/heading
  structure and keyboard reachability, and a diagram needs its accessible-scene treatment.

**Status: QUEUED, not started.** Wants a Phase-1 design first — this is a presentation architecture
question, not a patch.
