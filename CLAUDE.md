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

- **One writer at a time on `main`.** The `pre-commit` hook rebuilds the site and **force-stages** the
  regenerated `.html` + `book-models/*` on every commit, so two agents committing concurrently collide on
  those generated files. Keep exactly ONE agent editing/committing `main` at a time; run the full suite
  (`catalog_tests.py`) between writers. To isolate a second agent's change from a concurrent one (e.g. a live
  hand-edit), commit in TWO steps (the isolated change first) or `git stash` the second agent's own files
  across the first commit — never `git commit --no-verify` (banned; it skips the hook).
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
- Cross-cuts: 9 **forms**, **soft/hard** enforcement, and two book-thesis axes — **Move**
  (`constraint`/`sensor`/`package`, the Alignment-Thesis axis) and **Model**
  (`is-a-model`/`governs-a-model`/`—`, the Modeling-Thesis axis), each independent of soft/hard
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
