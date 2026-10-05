# CLAUDE.md — agent-governance-mechanisms

This repo is a **pattern catalogue**: <!--census:controls-->85<!--/census--> governance mechanisms that keep a fleet of autonomous coding
agents productive while bounding their failures, each written as a Gang-of-Four-style design pattern.
It is published as a static GitHub Pages site and embedded in a parent repo as a git submodule.

`catalog.py` is the one tool — **stdlib-only, no dependencies** (so `python3 catalog.py …` runs on a
fresh checkout with nothing installed). Do not add pip dependencies; keep it clone-and-run.

## Site is a preview; the book claims and expands

The published **site** — the landing, the catalogue views, the entry pages — is a *preview*: concise
framings and entry points. The **book** (under `book/`) is where each idea is *claimed and expanded*.
Two jobs, one for each surface.

The standing implication: **book coverage ⊇ site framings.** Any conceptual framing that appears on the
site should have a fuller treatment in the book. When you add a framing to the site's landing prose (the
`LANDING_INTRO`, the schools, the ways, the spectrum axis) or an entry page, either the book already
expands it or you owe it a home there. Site-only material is limited to *adoption and navigation* —
DIY-vs-install, the nav cards, the quick-start; those need no book counterpart. Everything conceptual does.

## What is a mechanism?

A **mechanism** is a recurring, failure-killing pattern of governance — written like a Gang-of-Four design
pattern: the failure class it prevents, the shape that prevents it, and why it is *not just* the cheaper
thing everyone already does. A mechanism earns its own entry only when it clears three bars:

1. **It kills a failure class, not a one-off bug.** If you can't name the recurring failure, it isn't a
   mechanism yet.
2. **It's distinct.** It does something the naive or adjacent alternative can't — every entry must survive
   its own "Why it's not just [X]" section. Two entries built on the same pattern are distinct only when
   they vary a *named axis* (lock cardinality, object model, enforcement scope, domain); if nothing varies,
   merge them.
3. **Its examples instantiate it.** Every example — in Motivation, in "Why it's not just…", in Known uses —
   must be a real case of *this* mechanism, not a sibling's. (A relational config-field ⊆ sample check is a
   *coherence* lint, not a per-source *semantic* lint — so cite it under coherence only.) An example
   borrowed from a neighbour blurs the exact boundary the catalogue exists to draw.

## Core principle: this repo must be interpretable by an independent Claude

**Every mechanism description must stand on its own to an agent that has no access to the parent
repo** — not its source, its docs, its tools, or its `CLAUDE.md` rule numbers. This is the
governing rule for all content here:

- **Describe artifacts by role and shape, not by unshipped filename.** "A host-level flock wrapper that
  serializes the test runner," not `` `test-serializer.py` ``. "A stable lint that reads the model at
  build time," not `` `lint-service-flow-model.py` ``.
- **Explain a governing rule's *content*; never cite a bare rule number.** "A project rule that a new
  event-bus topic must ship an observability entry," not "rule #46". A number like `#46` is meaningless
  outside the parent repo.
- **No dangling paths** into trees this repo does not ship (`services/…`, `deploy/…`, `docs/…`,
  `talks-and-notes/…`). Intra-catalogue links (`../<role>/<family>/<mechanism>.md`) are fine — they ship.
- **Prefer the conceptual statement over the concrete DocAble artifact** that happens to implement
  it. `Known uses` may name a real artifact *once* for grounding, but the mechanism must be understandable
  without it. The `product/` role is the catalogue's flagged project-specific exception; keep it
  self-contained too.

The test: *could a Claude that has only this repo read an entry and understand the mechanism well enough
to adapt it?* If it depends on a file, path, or rule number it can't see, the entry fails this rule.

## Working on this repo with a fleet (single-live-writer + parallel drafting)

Large changes are made by dispatched agents. Two facts shape how to parallelize them safely — **I keep
re-deriving these, so they live here:**

- **Give every parallel agent a WORKTREE; keep `main` for one writer.** Worktrees work inside this
  submodule — verified 261002: `git worktree add` registers under the superproject's
  `.git/modules/talks-and-notes/governance-catalog`, checks out completely, and `npm test` runs inside
  one with `node_modules` symlinked from the main checkout. That is the structural fix and it should be
  the default for any multi-agent wave: disjoint directories, one branch each, orchestrator merges.
  Earlier guidance here said gc agents work `main` directly with no worktrees; that was the best answer
  available before anyone tried, and it is now wrong.
- **One writer at a time on `main`** — still true for whoever IS on `main`. The `pre-commit` hook
  rebuilds the site and **force-stages** the regenerated `.html` + `book-models/*` on every commit, so
  two agents committing concurrently collide on those generated files. Run the full suite
  (`catalog_tests.py`) between writers. To isolate a second agent's change from a concurrent one (e.g. a
  live hand-edit), commit in TWO steps (the isolated change first) or `git stash` the second agent's own
  files across the first commit — never `git commit --no-verify` (banned; it skips the hook).
- **The INDEX is shared state, and `git commit` without a pathspec commits all of it.** This is the
  concurrent-writer hazard on `main`, and staging carefully does not defend against it. On 261002 an
  agent staged exactly one named path of its own, then ran `git commit -F -`; three files the
  orchestrator had just staged were already in the index, so they landed inside the agent's commit under
  the agent's unrelated message. The agent had used no `-A`, no `-a`, no `.`.
  - **The defense that holds is a pathspec commit:** `git commit -- <my paths>`, which builds a
    temporary index from exactly those paths and leaves everything else staged for its owner.
  - Before committing in a shared checkout, check `git diff --cached --name-only` for foreign paths. A
    foreign path means stop and ask, not commit.
  - **Caveat:** the `pre-commit` hook force-stages regenerated artifacts (`*.html`, `book-models/*`,
    `plugin/`), and a pathspec commit excludes them unless named. If your change legitimately
    re-renders output, diff it and name the changed tracked files explicitly.
  - `git add -A` stays banned for the same family of reasons, but note it was NOT the mechanism here —
    blaming it would have left the real hole open. (Diagnosed by the agent whose commit swept the files,
    correcting the orchestrator, who had asserted the mechanism without reading the command.)
- **The orchestrator's own dispatch ritual, written down because I ran it ~15 times by hand on
  261004.** Per wave: `git worktree add ../gc-wt/<name> -b <name> main`, then **three** `node_modules`
  symlinks — repo root, `workbench/`, `book/` — each pointing at the main checkout's copy. All three
  are needed: the workbench suite resolves from `workbench/node_modules`, and the browser/a11y tiers
  resolve Puppeteer and axe-core from `book/node_modules` and the root. A wave that can run `npm test`
  but not `test:browser` is usually a missing `book/` symlink. **Never `npm install` in a worktree** —
  the symlink means it mutates every live agent's tree at once.
- **Verify a merge on the MERGED tree, not on the branch — and land nothing on a number measured
  elsewhere.** Branches cut hours apart are each green against a different `main`. On 261004 two waves
  were individually green and their merge was red: a conformance fixture authored a property in the
  schema's object form (`{ value: … }`) while every shipped example used the scalar, and the other
  wave's newly per-key census refused it. Neither branch could have seen it. So after `git merge`, re-run
  `check`, `check:parity`, `test`, `build` — plus `test:browser` and `test:a11y` if anything reaches the
  page — **before** pushing. Likewise: tell each agent to **measure its own baseline**; a count quoted
  from an orchestrator brief is stale the moment a sibling lands.
- **Push under `run_in_background`, and verify by `origin`'s SHA — never by the gate's output.** The
  `pre-push` gate rebuilds the site and runs the Typst renders; it regularly exceeds a 120 s
  foreground call and gets killed mid-gate.
  - **The gate runs BEFORE the transfer, so its verdict says nothing about whether anything shipped.**
    On 261004 three consecutive pushes printed a clean `82 passed, 0 failed` and exited **141**
    (SIGPIPE) with `origin/main` unmoved — five merges sat local while every surface said success.
    The only honest check is `git rev-parse origin/main`.
  - **Cause, diagnosed rather than guessed:** git opens the SSH connection first, the hook then runs
    for minutes, and GitHub closes the idle session — in the measured case at line 240 of a
    1077-line push log, with the hook still working for another 800 lines. `git ls-remote` succeeded
    throughout, so it is idle-timeout, not connectivity.
  - **Fix, repo-local so nothing outside the working tree is touched:**
    `git config core.sshCommand "ssh -o ServerAliveInterval=20 -o ServerAliveCountMax=30"`.
    Reverts with `git config --unset core.sshCommand`. Related, and cheap to get wrong: `git commit -m "msg" -- <paths>` —
  the message must come **before** `--`, or git reads it as a pathspec and fails with "did not match any
  file(s) known to git".
- **Do not mix isolation modes in one wave.** If some agents in a wave get worktrees, they all do. On
  261002 three workbench agents had worktrees and did not collide; the one agent left on `main` is the
  one that collided. The control worked exactly where it was applied and failed exactly where it was not.
- **A writer is done only when it says so.** Gate the next writer on the agent's own completion
  signal. A `DONE-*.md` checkpoint, landed commits, and a quiet transcript all mean "it reached a
  reporting step" — none of them mean it stopped writing; agents routinely commit, checkpoint, then
  keep going through a verification round. Inferring completion from an artifact caused three
  concurrent-write incidents in one session (260930). If you must proceed without the signal, the
  cheap check is on the WRITER's side: a unit whose first commit's parent is not the HEAD it was
  given has just detected a concurrent writer, and should rebase rather than revert. Also treat the
  human as a writer — they open the deck or the file in an app whenever they like, so a dirty tree
  you did not cause is a reason to stop and ask, never to clean up.
- **A clean tree is not a safe tree: check for a live handle before rewriting a binary.** Before any
  unit rewrites a whole `.pptx` (a reorder, a repack, anything that replaces the package rather than
  patching one part), check `lsof <file>` for an open handle and look for a sibling `~$<name>.pptx`
  lock. An app holding the file open writes the WHOLE package on the next save, so its save silently
  replaces everything the unit did — and for a `sldIdLst` reorder there is no partial-credit version
  and nothing in the tree afterwards to show the work existed. The tree being clean and byte-identical
  to HEAD proves only that the human has not saved YET; it says nothing about what their next Cmd-S
  will do. Verified live on 260930: a unit's pre-flight caught an open handle on an otherwise
  pristine tree. Do the read-only analysis while you wait, then write as one fast transaction and
  re-check the handle immediately before writing — a confirmation that the file was closed goes stale
  in minutes.
- **Never infer from a fragment when the whole is a command away — this governs reading ARTIFACTS as
  much as agents.** The failure class is one thing wearing four costumes, all seen on 260930–261002:
  a live unit judged dead from transcript quiet; a dense ten-finding review judged empty from a
  one-word closing line; a slide paragraph reported as clipped because a single `<a:t>` run was
  read as though it were the line; and a shipped fix nearly reported BROKEN because a probe read
  `result.refusal` when the refusal lives at `result.answer.refusal` — three `null`s that described
  the probe, not the seam. In the third case the claim was false and shipped in a commit message
  before it was caught. Whenever you are about to characterise something, ask what the SMALLEST
  unit is that could carry the whole meaning, and read THAT. The concrete rules that follow, below.
  - **A probe that returns nothing has two explanations, and the likelier one is the probe.** Absent
    fields and empty results are the expected output of reading the wrong path, the wrong file, or
    the wrong revision — so before reporting an absence as a finding, dump the WHOLE object (or
    `ls` the directory, or `git show` the revision) and confirm the thing you were looking for is
    genuinely not in it. A verification that cannot distinguish "not there" from "I looked in the
    wrong place" reports the second as the first, and that direction of error is expensive: it
    condemns working code and sends someone to fix what is not broken.
  - **A brief's `file:line` facts are claims, and the orchestrator is the worst-placed person to
    trust them.** The same failure recurred SIX times on 261004, always by the same mechanism: a
    `file:line` asserted into a brief from a grep hit, without reading enough around it.
    `view-model.ts:926` was cited as a property's text when it is a model's PURPOSE — the brief's own
    exempt category; "~82 API members" conflated an interface's declared members with the 31-callable
    live surface; a model was called ungated when three test files load it; a sanctioned-consumer set
    named an entity a refactor had deleted; and a composition was declared absent that the registry
    declares (`machine-of-entity`). A seventh brief drew five corrections at once. Every instance was
    caught — by the agent, which is the system working, but at the cost of a round trip and an agent
    that had to argue with its own instructions.
    The fix is a step, not more care: **before dispatch, re-read each cited line with its
    surroundings and each cited symbol's definition.** Grep locates; it does not characterise. The
    two instances caught BEFORE dispatch on 261004 were both caught by exactly that step, which is
    the evidence it works. And say in the brief that its ground truth is a starting point the agent
    must verify — the reports that corrected these briefs all came from agents told to do so.
  - **A premise taken from a DESIGN DOC is a claim about the past, and the step above cannot catch a
    stale one.** Re-reading a cited line confirms the doc says it; it does not confirm the doc is
    still true of the code. Three briefs on 261005 stated a load-bearing premise accurately quoted
    from a doc and false at HEAD: the render brief said the forbidden generic fallback *"ships today"*
    (§A.3's own measurement — a commit that removed it was already an ANCESTOR of the wave's baseline);
    the ceiling brief said a student *"cannot author a budget requirement"* (the schema has carried
    `within:` for a version, and the Sensor Node ships exactly that requirement); the migration brief
    said the join gate *"compares two recorded strings"* (Phase 2's wording — it already interpreted
    through `verify`). Each wave refuted its brief and did the right work anyway, so the cost was a
    redirect rather than a defect; a brief that had been BELIEVED would have produced three wrong
    changes.
    The step: **when a premise is "the code does / does not do X," cite CODE at the brief's base sha
    — never a doc that asserts it.** A doc may motivate the work; it may not supply the fact. And
    keep the standing instruction that makes the failure cheap: every brief tells the agent the
    premises are a starting point and asks it to report what the brief got wrong. All three
    corrections above came from that sentence.
  - **A negative claim is only as wide as the search that produced it, and the step above cannot
    catch one.** The dual of the bullet above, and the more dangerous half: that step says *re-read
    each cited line*, which is unavailable when the finding IS that nothing matched. Twice on 261004
    the orchestrator asserted an absence from a shaped search. A grep of `models/` — the four
    SELF-models — found no `executes_in_state` and produced the conclusion that the property was
    unused; it lives in `examples/document-processing/system.mage.yaml`, and `src/quant/charge.ts`
    calls it "the join entity accounting runs on", so the brief that nearly shipped would have sent
    an agent to delete a live feature. Then a grep for `sum`/`min`/`max` as operator names found none
    and produced "quantity aggregation is machinery we do not have" — it ships and runs in CI, and
    the operators are absent because the FORM fixes the aggregation while the query selects the set
    (`a target selects WHICH executions — never how they aggregate`). A design question was put to
    the author on that false premise and had to be withdrawn.
    Both misses were structural, not careless: the first was scoped to the wrong subtree, the second
    searched for a spelling the design deliberately does not use. **So before writing an absence into
    a brief, widen it on all three axes — PATH (is the subtree the whole corpus?), SPELLING (would the
    codebase name this differently?), and SHAPE (could the capability exist without the token you
    searched for?).** Then write the negative as a premise to refute and name the search that produced
    it, so the agent can widen what you narrowed. That is what caught both: the joins brief said "if
    any part of this does not survive your own reading, say so and stop", and the quantification brief
    asked for evidence either way — the first was confirmed, the second refuted the premise it was
    sent to check.
- **Reading OOXML text: runs are not lines. Join the runs inside each `<a:p>` before you compare
  anything.** PowerPoint splits a single sentence across arbitrarily many `<a:t>` runs and re-splits
  them on every save, so a run routinely begins mid-word — the 261001 instance was a run starting
  `raw boxes and arrows…` because `…why do SWEs d` ended the run before it. Diffing runs therefore
  invents edits that never happened and hides real ones; diff PARAGRAPHS. The same caution applies to
  any claim about on-slide wording: extract per-`<a:p>`, join, then compare. (Sibling gotcha: a
  `slidenum` field's `<a:t>` is a stale RENDER CACHE, not the position — see above.)
- **An agent's state comes from a content probe, not a surface signal.** Silence, a terse closing
  line, a short tool count, a stale task-output file — none of these distinguish a dead unit from a
  working one, or an empty review from a dense one. **The task-output file's mtime is not a liveness
  signal at all:** on 261001 one sat frozen for 40 minutes while the agent it belonged to committed
  three times and staged a fourth. Probe the content instead. For liveness: `git log --format=%cI`
  for commit times, and `git status --porcelain` on the artifact — a staged-but-uncommitted change
  means the unit is mid-commit *right now*. For a review: read the report body, never the final
  message. Both directions cost real work on 260930–261001 — a unit judged dead after an hour of
  transcript quiet was live, and a `git checkout --` was staged over its uncommitted fixes (its index
  lock is what stopped it); a review judged empty from a one-word tail held ten measured findings,
  two of which inverted an author's intent. The asymmetry is the point: a probe costs seconds, and
  acting on a wrong inference destroys work or discards a finding nobody will look for twice. A
  corollary for whoever holds the tree: a live unit's staged work sits in the SAME index you are
  about to commit from, which is the second reason `git add -A` is banned here — stage named paths,
  or you will author a commit containing another writer's in-flight work.
- **A read-only agent must write its report to a scratch file — "your final message is the
  deliverable" loses the work.** The bullet above says to read the report BODY and never the final
  message; a read-only survey has no body, so there is nothing to read. On 261003 a layout-engine
  survey spent 15 minutes, 68 tool calls and 207K tokens, and its completion arrived as the single
  word `Complete.` — every finding gone, despite a brief that said in terms "return your findings
  inline as your final message — that text IS the deliverable." The transcript is no fallback: it is
  the full subagent JSONL and reading it overflows the orchestrator's context. Recovery exists —
  `SendMessage` by name resumes a completed agent from its transcript and a prioritised, word-capped
  request gets the findings — but it costs a second round trip of the same length. So: when the
  deliverable is analysis rather than code, have the agent **write the report to a scratch file
  outside the repo working tree** (the session scratchpad or `/tmp`) and reply with only that path
  plus three lines. It stays read-only with respect to the tree — no worktree, no collision with
  in-flight writers — and the deliverable becomes durable and selectively readable. A file is the
  artifact; a final message is a courtesy.
- **An agent killed mid-task has usually FINISHED more than its last line says — verify and commit on
  its behalf before redoing the work.** Two waves died to a session limit on 261002 with zero
  commits, each ending on a line like "Now the node-tier test." Both were in fact COMPLETE,
  including the tests they said they were about to write: `tsc --noEmit` was clean and the suites
  were green at the recovered trees (634 and 642). The recovery is cheap and the rework is not, so
  the order is: probe the worktree (`git status --porcelain` for the surface, `git diff --cached`
  for anything staged), run the FULL gate set yourself at that tree, then stage named paths and
  commit on the agent's behalf — noting in the message that the orchestrator recovered it and what
  was verified, since the commit is not the author's own claim. Only redo work the gates reject. A
  dead agent's closing sentence describes its INTENT at the moment the process stopped, which is a
  statement about its plan and not about the disk.

- **A failed Pages run: read the STEP NAME from the API, then reproduce locally — the logs are 403.**
  `catalog.py deploy github` and a plain `git push` both hand off to GitHub Actions, and when that
  fails the instinct is to read the log. You cannot: `/actions/jobs/<id>/logs` and
  `/actions/runs/<id>/logs` both return **403 without a token**, so the error TEXT is unavailable.
  What IS public is enough to work with —
  `curl -s .../actions/runs?per_page=3` gives `head_sha` / `status` / `conclusion`, and
  `curl -s .../actions/runs/<id>/jobs` gives every step with its conclusion, so the FAILING STEP'S
  NAME is one call away. Take that name, find the step's `run:` block in
  `.github/workflows/pages.yml`, and execute exactly that command locally. Three failures on 261003
  were diagnosed this way and each had a different cause: a Python install ordered after the suite
  that shells out to it; a gate asserting zero where the local suite accepted a known violation; and
  a tier that passes locally and fails on the runner. **The third is the one to expect** — when a
  step passes here and fails there, suspect what the runner does NOT have (fonts are the first
  candidate: the workflow installs none, and any assertion pinned to a layout that depends on text
  metrics is pinned to the developer's font stack). Watch the run to CONCLUSION rather than reporting
  the push: a clean push proves the pre-push hook ran, nothing more.

- **Drafting parallelizes; infrastructure serializes.** Split a big job into (a) SEQUENTIAL INFRASTRUCTURE —
  `catalog.py` / `book/build_book.py` / `book/book_typst.py` renderers, packers, migrations (shared
  files, one writer) — and (b) PARALLEL CONTENT DRAFTING — prose, blurbs, notes — that writes to DRAFT files
  under `book/_design/drafts/` (NOT `main`, not committed, not built). Draft files are independent, so MANY
  drafting agents run concurrently, with each other and with the `main` drain; an infrastructure wave
  assembles the drafts later. This is how to author a large appendix/section without serializing on the
  single-writer tree.
- **Per-effort draft subdirs + verify-before-fold.** `book/_design/drafts/` accumulates ALREADY-FOLDED,
  stale drafts across many rounds — a flat dir invites a later wave to re-read a superseded draft or
  clobber a fresher one. So each drafting wave writes to its OWN subdir, `drafts/<effort>-<date>/` (e.g.
  `drafts/part5-r3-260810/`), never the flat root. And before folding a draft into `main`, DIFF it against
  the current `main` chapter: if `main` diverged since the draft was cut (a fold-time fix, a sibling wave's
  edit), PATCH-fold the draft's intended change onto `main` rather than REPLACE-folding the whole file —
  a replace-fold silently reverts every fix `main` gained after the draft forked.
- **Gate discipline:** verify each `main` commit on the full suite BEFORE stacking the next writer; NEVER
  `git add -A` (it sweeps `book/_design/`); briefs read this file (the submodule ROOT `CLAUDE.md` — there is
  no `book/CLAUDE.md`).
- **Run the TYPE-CHECK and the tests after every land, not just the tests.** A clean merge can produce a
  tree where every test passes and the code does not build, because disjoint branches can be
  *semantically* incompatible. Seen 261002: one wave stubbed an `AccessibleScene` literal, a concurrent
  wave added eight required fields to that type, no line was touched by both, git merged happily, and
  `tsc` went red while `npm test` stayed green at 325 the whole time — `node:test` does not typecheck. The
  fix was not to pad the stub but to use the real renderer the stub stood in for; a stub in a module
  named `realPorts` was the actual defect, and it silently voided the accessible-view requirement at the
  one seam that produces it.
- **A gate exists and the path meant to run it does not reach it — so check the WIRING, not the gate.**
  Three instances on 261002–261003, every one silent. `npm run all` reached neither the browser nor the
  a11y tier, so a wave that broke four a11y assertions ran the default gate, saw green, reported "tsc and
  build clean" (true of the node tier, and of nothing else), and landed a duplicate-landmark defect on
  `main`. The publishing workflow never ran the smoke tier it gained the same day, the only gate that
  loads `learn.html` as a page rather than as a module. And that workflow ran the node suite before
  installing the Python the suite shells out to, which failed a published build. The class points two
  ways: a gate the runner never INVOKES, and a gate it invokes before the gate can RUN. Patch one costume
  and the other stays free, which is how three of these landed in two days. The rule: when you add a
  gate, wire it into every runner that should reach it, and DECLARE the runners that deliberately do not.
  A measured reason to exclude a tier is fine; an undeclared exclusion is not, because from a script list
  alone an excluded gate and a forgotten one look the same. Both halves are now held —
  `workbench/test/gate-reachability.test.ts` walks the default gate and the workflow against a gate set
  derived from `package.json`, and `tests/ci.py` holds an install ahead of the suite that needs it.
  Checking a runner you have not watched fail is worth little: sabotage it, see the red, restore.
- **A worktree's `node_modules` may be a SYMLINK to the main checkout's — never `npm install` in one.**
  Parallel agents share that one directory, so an install mutates every live agent at once: silently, and
  blamed on whichever one fails next. A brief that needs a package to *measure* something must say to
  install it in an isolated `/tmp` directory with its own `package.json`. Check `pwd` before invoking a
  package manager.
  - **`git worktree add` does not create that symlink — the orchestrator does, as a second step.** A
    fresh worktree has NO `workbench/node_modules`, so the agent's first `npx tsc` or `npm test` fails
    on a missing package and its likely next move is the `npm install` banned above. Create the link
    when you create the worktree, not when the agent reports a failure.
  - **It is THREE symlinks, not one** — corrected 261003 after a wave reported the gap and created the
    two the procedure had missed. The browser and a11y tiers resolve across the whole tree: the root
    `node_modules` holds axe-core, `book/node_modules` holds Puppeteer, and `workbench/node_modules`
    holds the workbench's own dev deps. A worktree with only the third gets a green `tsc` and a green
    node suite, and the browser tiers cannot start — which reads as infrastructure trouble rather than
    as a missing link. Create all three:
    `for d in node_modules book/node_modules workbench/node_modules; do ln -s <main>/$d <worktree>/$d; done`
    then confirm one binary resolves through each (`.bin/tsc`, and that Puppeteer's entry file exists).
    Verify they are SYMLINKS afterwards: a real directory there means someone ran the banned install,
    and the lockfiles are the place to check for damage.
- **The `pre-commit` hook stages MAIN-CHECKOUT files into a worktree agent's commit.** `core.hooksPath`
  points at the main checkout, so the hook runs with that `cwd` and its `git add` of regenerated `*.html`
  + `book-models/*` inherits `GIT_INDEX_FILE` — the files ride into the agent's commit snapshot even
  though it used a pathspec and edited none of them. Two agents reported this independently on 261002.
  Harmless when those blobs already match `main` (verify with `git rev-parse <branch>:<path>` against
  `main:<path>` — identical blobs are a no-op in the 3-way merge), and a silent cross-writer edit when
  they do not. Verify before landing; do not assume.
- **Generated output drifts when a commit route skips the hook — `git merge` is such a route.** The hook
  rebuilds the site and force-stages the regenerated `.html`, which keeps the committed HTML in sync for
  ordinary commits and does nothing on a `merge --no-ff`. After several merge-landings in a row the
  committed `index.html` was missing a card `catalog.py` had been generating for hours; nothing reached
  the published site, because CI re-renders from source on push, but the committed tree was stale and the
  drift surfaced only when a later hook run left a modification that blocked the next merge. Prefer a
  gate that compares committed output to a fresh render over one that depends on every future commit
  route cooperating.

## Writing style

An entry is read by a busy engineer and a coding agent. Write for both: plain, direct, no padding. Aim
for Hemingway — short sentences, strong verbs, few qualifiers.

- **Active voice; name the actor.** "The reclaim trusts the record," not "the record's correctness is
  what the reclaim trusts." Prefer "X does Y" to "Y is what X does."
- **Avoid the "the X *is* a Y" copula, except very rarely.** An equative sentence stalls — reach for the
  verb that says what X *does*. "The pre-commit hook gates every commit," not "the pre-commit hook *is* a
  gate." Keep the copula only when the identity claim itself is the point and no verb captures it.
- **Short, declarative sentences — one idea each.** Break a clause-stacked sentence into two.
- **Break up blocks; prefer bullets.** A wall of text goes unread. Keep paragraphs to 2–4 sentences —
  lead a section with the frame, then break the detail out. An enumeration of three or more items is a
  list, not a comma-run; give each bullet a **bold lead-in** naming what it is.
- **Say it once.** State the point and move on. No "One line:", no "the heart of it", no closing
  sentence that restates the paragraph. And don't let two sections restate each other — the Motivation,
  the "Why it's not just", and the closing each make a *distinct* point.
- **Concrete words, not reflex labels.** Reach for the precise term — *central*, *authoritative*, *the
  weak point*, *essential*. Use "load-bearing" very sparingly, if at all.
- **Cut qualifiers.** Drop *very, quite, essentially, arguably, reliably*, and "the whole point". Keep
  *precisely because* / *exactly when* only where they sharpen a causal claim — cut them as bare
  intensifiers. Bold one or two phrases per section, not by habit.
- **Describe, don't sell.** Give the mechanism and the failure it kills. Don't crown it (*the best*, *the
  highest-leverage*), don't tell the reader every project should adopt it, and don't comment on the
  entry's own novelty or thinness — those are the reader's calls. In book prose the same rule holds —
  present clinically, confidence paired with an explicit caveat, never absolutism — but the sanctioned
  first-person field-note asides that carry the book's warmth stay intact (see
  [`writing/voice.md`](plugin/mage/skills/self-communicate/writing/voice.md) §"Engineering textbook, not conference keynote").
- **Organize exposition by the engineering system, not the project timeline.** A lived incident may
  *motivate* a section, but its spine is the architecture the mechanism belongs to, and the reader should
  be able to follow the mechanism without the chronology (as-built status notes excepted — mark them as
  divergence). See [`writing/voice.md`](plugin/mage/skills/self-communicate/writing/voice.md) §"Engineering textbook, not conference keynote".
- **Avoid excessive LLM tells — vary, don't ban.** The em-dash-as-universal-joint, the mechanical
  tricolon (rule of three), the reflexive "not X, but Y", and a uniform antithesis cadence are the giveaways
  of machine prose. The fix is not prohibition — these are classical rhetorical figures that land when used
  deliberately. The tell is *sameness and density*: the same figure on a fixed beat. So cap em-dash density
  (prefer a period, comma, or colon; reach for the dash only for a genuine aside), and don't let any one
  figure recur on every beat. Draw variety from the toolkit in
  [`writing/rhetoric.md`](plugin/mage/skills/self-communicate/writing/rhetoric.md),
  and match the house voice in
  [`writing/voice.md`](plugin/mage/skills/self-communicate/writing/voice.md). To audit existing
  prose against all of these rules and emit concrete fixes, follow
  [`writing/audit.md`](plugin/mage/skills/self-communicate/writing/audit.md). These style files are
  the resources of the `self-communicate` skill.
- **Instance entries lead with the portable pattern.** When an entry instantiates a general pattern,
  open its Intent with the transferable claim, then name the project instance in parentheses —
  *"…route all mutation of a format through one typed model with a ban-lint on the raw library (our
  instance: `PdfModel`)."* A reader who doesn't share the domain still gets the idea.

## The content model

- **Entries** live at `<role>/<family>/<mechanism>.md` — roles are `agent/`, `models-bridge/`, `product/`.
  Every entry follows the template documented in [`README.md`](README.md): a title, an `**Intent** —`
  line, a 6-row metadata card (`Summary · Target · Form · Move · Model · Enforcement`) plus an optional
  7th `Derivation` row on `is-a-model` entries, then the sections (`Motivation` … `Related mechanisms`).
- **[`INDEX.md`](INDEX.md)** is the census — one row per entry, grouped by family. The `Form`, `Move`,
  `Model`, and `Enf.` columns MUST match the entry's metadata card (the validator enforces this).
- Cross-cuts: 9 **forms**, **soft/hard** enforcement, and two book-principle axes — **Move**
  (`constraint`/`sensor`/`package`, the Alignment-Principle axis) and **Model**
  (`is-a-model`/`governs-a-model`/`—`, the Modeling-Principle axis), each independent of soft/hard
  (`README.md`). Plus **relationship** tags on the Related-mechanisms bullets — a tight, **closed**
  canonical set (`REL_TAGS` in `catalog.py`, UML-informed: `Counterpart`, `Generalization`, `Enabler`,
  `Consumer`, `Layer`, `Bridge`, `Sibling`, `See also`). The validator **enforces membership**: every
  Related bullet's lead tag (minus any trailing `(qualifier)`) must be in that set.
- **One entry, or two, for a construction + its enforcement?** By enforcement scope. A **dedicated**
  (one-to-one) enforcement — a ban-lint guarding *this one* seam — is **bundled into the construction
  entry** (the typed model + its ban-lint is one mechanism). A **cross-cutting** (one-to-many) enforcement
  that governs *many* constructions earns **its own entry** (`drift-parity-gates` governs every model;
  `f10-wiring-lint` governs every mutator verb). Don't split a dedicated pair; don't bundle a cross-cutting
  one.

**When you add or edit a mechanism:** update both the entry and its `INDEX.md` row in the same change,
then `python3 catalog.py validate` (must be 0 issues). The schema, INDEX-consistency, link-integrity,
and hover-summary checks all live there.

## Build & deploy

The site is generated from the markdown — **never hand-edit the `.html`** (it carries a
`GENERATED by catalog.py build` banner and is overwritten on every build).

| Command | What it does |
|---|---|
| `python3 catalog.py validate` | schema + INDEX + link + summary checks; exit 1 on any violation |
| `python3 catalog.py build` | render every `.md` → sibling `.html` + regenerate `index.html` (census) + `catalogue-views.html`; BLOCKING reachability gate — fails (exit 1) if any built page is an orphan (rendered but nothing links to it) |
| `python3 catalog.py deploy local` | validate → build → serve at `http://127.0.0.1:8137/` (`--port` to change; **not** 8080) |
| `python3 catalog.py deploy local --pdf` | same, but first render `book/mage-book.pdf` (print-native Typst path) so the local preview's **Download PDF** link serves the current book |
| `python3 catalog.py deploy github` | validate → build → commit changes → `git push origin main` (GitHub Actions then deploys Pages **and renders + publishes the PDF**) |
| `python3 catalog.py install-hooks` | one-time: `core.hooksPath=hooks` so `pre-commit` auto-runs validate+build+stage |

### The PDF print edition

The book ships a **PDF** at `/book/mage-book.pdf` (the landing's "Download PDF" button). It is **gitignored
on purpose** — a multi-MB binary does not belong in git history — so it is *created, never committed*:

The PDF is rendered by the **print-native Typst path**: `book/build_book.py --pdf` projects the same
typed book IR the web build walks to a Typst document, then `typst compile` lays it out. One IR, two
projections (HTML web + Typst PDF), so the PDF cannot diverge from the web book.

- **Published (authoritative):** the Pages workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml))
  runs `python3 book/build_book.py --pdf` on **every push**, runs the content-integrity gate (whole-book
  text extraction + page floor/ceiling + density + no-raw-mermaid + tag-tree present), and hard-asserts the
  file into the site artifact. So `deploy github` always ships a PDF freshly rendered from source — no flag needed.
- **Local preview:** the default web build does **not** render the PDF, so any `book/mage-book.pdf` on disk
  goes stale between renders. Regenerate it on demand (Typst compiles the whole book in a couple of seconds)
  with `catalog.py deploy local --pdf`, or directly via `python3 book/build_book.py --pdf`.

**Two deploy modes, one command:**
- **`deploy local`** — preview in a browser. Blocks while serving; Ctrl-C to stop. Add `--pdf` to also
  render the PDF print edition first (see "The PDF print edition" above).
- **`deploy github`** — publish. Commits any pending changes and pushes; the
  [`.github/workflows/pages.yml`](.github/workflows/pages.yml) workflow rebuilds and deploys to Pages.
  (Requires Settings → Pages → Source = "GitHub Actions".)

Both modes **always validate + build first**, so a broken schema can never be served or published.

## Serving model

GitHub Pages serves the committed HTML (deploy path = the Actions workflow, which re-runs
`catalog.py build` in CI — the "executable, can't-drift" build). The tracked `hooks/pre-commit` keeps
the committed HTML in sync locally; CI is the source of truth on push. `.nojekyll` disables Jekyll so
files are served as-is.

## Submodule relationship

This repo is embedded in a parent repo as a submodule. Edits happen **here** (commit + push to this
repo's `origin/main`); the parent then bumps its gitlink pointer separately. This repo has no knowledge
of the parent — treat it as standalone.

## Standalone posture

The catalogue is distilled from a real product (DocAble, live at scholaccess.com) — referencing it and the paper is fine. The
real constraint is that every entry stays **standalone and interpretable**: no absolute paths, and no
dangling internal file or rule-number references an outside reader can't resolve (the abstractions
glossary exists for exactly this — see the interpretability principle above). `scholaccess.com` and the
paper are the deliberate outward links.
