# audit.md — a playbook for auditing prose

This is an **agent-facing** style doc — a resource of the `self-communicate` skill, not a catalogue entry.
It is not rendered to HTML or served; it is read by an agent authoring or auditing prose.

## What this is

A procedure an LLM runs over a passage of prose to grade it and emit concrete fixes. It operationalizes
the three style sources into a checklist:

- [`rhetoric.md`](rhetoric.md) — the rhetoric toolkit and the sameness/density tells.
- [`voice.md`](voice.md) — the target voice (Prof. Davis) with verbatim exemplars.
- [`document-types.md`](document-types.md) — the document-type taxonomy (book / tutorial / reference /
  design doc / blog), each with type-specialized checks the passes below do not carry.
- The house-rules writing-style discipline — active voice, say-it-once, cut-qualifiers, describe-don't-sell,
  and the interpretability principle (a passage must stand alone; describe artifacts by role, not by
  unshipped filename).

**Name the document type first.** Before Pass 1, consult [`document-types.md`](document-types.md) and name
the type (engineering book, tutorial, reference/API doc, design doc, blog/keynote). The type carries
**artifact-scale checks** the per-passage passes below miss — a thesis that must recur across a book's
chapters, a visual per chapter, a section-length cap, a tutorial that must not smuggle a thesis. Add the
type's specialized rules (see that file's §"How the audit uses this file") to the findings, then run the
passes.

Run the passes **in order**. Each pass says what to DETECT (a heuristic mechanical enough to actually
apply) and the FIX. Collect findings as you go; rank and format them at the end.

---

## Pass 1 — LLM-tells / density scan

The mechanical pass. Count things; a count over threshold is a finding.

- **Em-dash density.** Count em-dashes (`—`) per 100 words, and flag any single sentence with two or more.
  **Detect:** more than ~1 dash per 40–50 words, or a passage that uses the dash for *every* aside,
  insertion, and pivot — the "universal joint" pattern. **Fix:** vary the punctuation *and the structure* —
  a period (two sentences), a comma (a light aside), a semicolon (two linked clauses), or a **bullet /
  numbered list** where you are really enumerating; a colon only for a genuine setup→payoff. Do **not**
  reflexively swap every dash for a colon — that just trades one tell for another. Plain declarative
  sentences and lists are first-class in this register; a doc need not be all flowing prose. Keep the dash
  only for a genuine interruption. Aim to cut dash count by at least half.
- **A single figure on a fixed beat.** **Detect:** the same rhetorical figure recurring paragraph after
  paragraph — most often the **mechanical tricolon** (three-item parallel lists on repeat) or the
  **reflexive "not X, but Y"** (count these two phrasings specifically; two in a short passage is a smell,
  three is a finding). Also watch for anaphora or antithesis on every beat. **Fix:** keep the strongest
  one instance; rewrite the rest. Swap in a *different* figure from `rhetoric.md` (list two items
  instead of three, or four; turn one "not X, but Y" into a plain assertion; replace a tricolon with a
  single sharp claim). Variety is the fix, not deletion.
- **Uniform sentence length / cadence.** **Detect:** a run of sentences all roughly the same length
  (say, 5+ sentences all 15–25 words with the same subject-verb-object shape). Machine prose drones at one
  tempo. **Fix:** break the beat. Put a short 3–6-word sentence next to a long one. Front-load a
  fragment. The house voice alternates aphoristic declaratives with longer explanatory chains — mirror
  that rhythm (see `voice.md`).
- **Ornament burying the argument.** **Detect:** a paragraph so dense with figures that the point is hard
  to extract on one read. **Fix:** state the point plainly first, then add back *one* figure where it
  sharpens the sentence.

## Pass 2 — Voice match (vs `voice.md`)

Compare against the target voice. The exemplars in [`voice.md`](voice.md) are the reference.

**Match the ENGINEERING register by default.** `voice.md` carries three registers, and for repo
prose — mechanism entries, design docs, CLAUDE rules, code comments, runbooks — the target is the
**engineering / documentation** register (the third-party Apache-docs exemplars E1–E8), NOT the essay or
academic ones. Grade against the engineering exemplars and against [`engineering.md`](engineering.md)
(the Diátaxis discourse layer). Reach for the discursive register only in a genuinely persuading
**Motivation**, and the academic register only in a scoped **Intent** / "Why it's not just X" claim. If a
reference or how-to passage reads like an essay, that is a register-drift finding — flag it and pull it
back to the engineering register.

- **Hedging.** **Detect:** stacked qualifiers softening a claim the writer clearly believes — "it seems
  that perhaps this might arguably…". **Fix:** state it. The house voice is confident; it does not perform
  uncertainty.
- **Absolutism with no caveat.** **Detect:** a sweeping claim ("this always works", "never fails") with no
  acknowledged limit. **Fix:** pair confidence with an explicit caveat, in the exemplar cadence — "YES,
  with an important caveat" / "But it is not a silver bullet." Add the real limit right after the claim.
- **Abstract claim with no concrete anchor.** **Detect:** a generalization that arrives before (or
  without) any instance — a number, a named event, a worked example. **Fix:** put the anchor first. The
  voice earns the abstraction with the instance ("72 minutes", "the CrowdStrike outage", the Ship of
  Theseus), never floats it alone.
- **Register drift — jargon where a plain word would carry it.** **Detect:** an inflated or abstract word
  doing a job a common word does better. **Fix:** reach for the plain word ("pickle", "silver bullet")
  when it carries the idea, and the exact technical term only when the plain word won't.
- **Abstract paraphrase of a concrete operation.** **Detect:** the prose describes a concrete engineering
  action through abstract nouns, nominalizations, or metaphor when it could name the actor and operation
  directly. Common signals include abstractions made grammatical actors (*authority binds*, *evidence
  acquires consequence*, *the mechanism carries authority*) and vague verbs such as *make effective*,
  *operationalize*, *instantiate*, or *realize* where a more exact verb is available. **Fix:** ask *what
  actually happens?* Name the actor and use that verb: the permission forbids, the validator checks, the
  test produces evidence, the gate rejects, the environment enforces. Keep the abstraction only when the
  abstraction itself is what the passage is reasoning about.
- **Missing direct address where it would help.** **Detect:** instructional prose that lectures past the
  reader when a "you" would land it. **Fix:** address the reader once, at the point that matters ("You'll
  hit this the first time two agents share a worktree"). Keep it occasional — constant second-person turns
  preachy.

## Pass 3 — House style (the writing-style rulebook)

The house rulebook — the writing-style discipline (active voice, say-it-once, cut-qualifiers,
describe-don't-sell). Each item below is a named rule in that discipline.

- **Passive / actor-less voice.** **Detect:** "Y is what X does", "the record's correctness is what the
  reclaim trusts", any subject that is not the actor. **Fix:** "X does Y" — name the actor, use the strong
  verb. "The reclaim trusts the record."
- **The "X *is* a Y" copula.** **Detect:** an equative sentence that stalls on "is a / are a". **Fix:**
  reach for the verb that says what X *does*. "The pre-commit hook gates every commit," not "the
  pre-commit hook *is* a gate." Keep the copula only when the identity claim itself is the point.
- **Restating the same point (say-it-once).** **Detect:** a "One line:" / "the heart of it" opener, a
  closing sentence that restates the paragraph, or two sections making the same point. **Fix:** cut the
  restatement. Make each section carry a *distinct* claim.
- **Bare qualifiers.** **Detect:** *very, quite, essentially, arguably, reliably*, "the whole point", "the
  heart of". **Fix:** delete them. Keep *precisely because* / *exactly when* only where they sharpen a
  causal claim.
- **Fluffy adjectives (the economy / less-is-more rule).** **Detect:** a decorative modifier that adds heat
  but no checkable information — *powerful, seamless, robust, elegant, comprehensive, cutting-edge,
  sophisticated, blazing-fast, world-class*. Qualifiers weaken a claim; fluffy adjectives inflate it, and
  both are ornament the idea does not need. **Fix:** delete the adjective and let the mechanism carry the
  claim ("a validator that checks output ⊆ input", not "a powerful validator"), or replace it with an
  adjective the reader can check (*idempotent*, *148-line*, *at-least-once*). Ornamental language is reserved
  for a genuinely persuading blog or keynote and used sparingly even there; in repo prose flag it. Grounds:
  [`voice.md`](voice.md) §"Economy — less is more".
- **Reflex labels.** **Detect:** "load-bearing" and similar filler labels used by habit. **Fix:** the
  precise term — *central*, *authoritative*, *the weak point*, *essential*.
- **Selling / crowning.** **Detect:** "the best", "the highest-leverage", "every project should adopt
  this", or the prose commenting on its own novelty or thinness. **Fix:** state the mechanism and the
  failure it kills. Let the reader judge value.
- **Wall of text where bullets fit.** **Detect:** a paragraph over ~4 sentences, or a comma-run of three+
  parallel items inside one sentence. **Fix:** break to bullets with a **bold lead-in** per item; lead the
  section with the frame, break the detail out.

## Pass 4 — Structure & flow

Read the passage as a whole, top to bottom.

- **Weak transitions.** **Detect:** paragraphs that jump with no connective logic, or lean on "Moreover /
  Furthermore / Additionally" as filler glue. **Fix:** open each paragraph with the claim that follows
  from the last; cut the filler adverb.
- **Non-parallel headings.** **Detect:** a heading set that mixes grammatical shapes (one noun phrase, one
  imperative, one gerund). **Fix:** pick one shape and apply it across the set.
- **Sections restating each other.** **Detect:** two sections (e.g. an intro and a "why it matters") that
  make the same point in different words. **Fix:** merge them, or sharpen each to a distinct job — the
  house rule is that Motivation, "Why it's not just", and the closing each land a *different* point.
- **Cross-document duplication.** **Detect:** a passage that appears near-verbatim in a *sibling* doc (a
  landing page and a README, two overlapping guides). Each reads clean in isolation, so the per-passage
  passes above miss it. **Fix:** this is a **[DESIGN] drift hazard**, not a per-passage rewrite — flag it to
  single-source the shared text (generate both copies from one constant), because an edit to one copy won't
  propagate to the other and they silently diverge.
- **Buried lede.** **Detect:** the main claim arriving in the third paragraph after setup. **Fix:** lead
  with the frame, then support it.
- **Self-narrating structure (the artifact as actor).** **Detect:** a sentence whose subject or pronoun
  is *a part of the document itself* — "it" / "its pages" standing for the chapter, "this chapter carries
  …", "the insets it gives you", "the section below hands the reader" — so the text narrates its own
  apparatus (chapter, page, section, inset, figure) as an actor doing something *for the reader* instead of
  just delivering the content. Canonical tell: a bare "it"/"its" that refers to the artifact-part rather
  than to a subject in the writing. Example: *"So it carries the concept insets a reader needs to read its
  model pages: what an automaton is, safety versus liveness, …"* **Fix:** delete the meta-commentary and
  state the content directly — name the ideas and let the apparatus do its job silently: *"…become
  predicates over an order of events. That step-up pulls in a cluster of ideas: what an automaton is,
  safety versus liveness, …"* **Not** a blanket ban on signposting: "the rest of this chapter defends
  this", "see the appendix", "the figure below" are fine. The anti-pattern is narrowly (a) a pronoun that
  stands for a structural part *as an actor*, and (b) narrating the apparatus (the insets/pages the
  document "carries") when you could just present the thing.
- **Trailing remark that trails (one thing well; clean endings).** **Detect:** a chapter or section whose
  CLOSING wanders off its subject — a final paragraph that opens a *new* topic, tacks on a loosely-related
  afterthought, or names something the book won't cover, then peters out without landing the section's own
  point, referencing a related chapter, or segueing to the next. The tell is an ending that *introduces*
  rather than *concludes* (a last paragraph that starts a whole new subject and closes on "a treatment this
  book does not attempt"). Its sibling: a chapter trying to do *two* things — its own subject plus a
  bolted-on aside that belongs elsewhere. **Fix:** a chapter does ONE thing well. Move the aside into a
  **footnote / sidenote** (the `>`-aside), or cut it, or turn the ending into a real close — land the
  chapter's point, reference a related chapter by name, or segue to the next. An ending may point onward,
  but it must *conclude*, not merely trail.

## Pass 5 — Visualization

Ask whether a picture would carry the content better, and whether any picture already present is the right
kind and readable. Grade against [`../drawing/diagrams.md`](../drawing/diagrams.md) (diagram vocabulary + realization
rule). This pass applies to any passage that describes a shape, and to any passage that already has a
diagram — not only catalogue entries.

- **A diagram is warranted but missing.** **Detect:** a wall of prose describing a *shape* — an
  architecture, a multi-actor interaction over time, a lifecycle with states, a data schema, a branching
  procedure. Prose that spends three-plus sentences tracing "A connects to B, which calls C, which returns
  to A" is carrying a shape the reader has to reassemble in their head. **Fix:** draw it. Add the diagram
  type that fits the shape (per `../drawing/diagrams.md`: structure→C4/component/deployment, behavior→sequence/
  state/flow, data→ER/class), and cut the prose down to the frame plus the diagram's takeaway.
- **Wrong diagram type.** **Detect:** a diagram whose type fights its content — a flowchart drawing a
  lifecycle (its "steps" are really states), a sequence diagram for standing structure, a schema where an
  interaction was meant. **Fix:** swap to the right type. Ordered actor messages → sequence; one entity's
  states → state; standing parts → component; persistent data → ER. A flowchart used where a state diagram
  belongs is the most common miss.
- **Bespoke SVG where Mermaid would do.** **Detect:** a hand-authored HTML/inline-SVG diagram whose layout
  is an ordinary graph, sequence, or state shape Mermaid can lay out — with no stated reason for the drop.
  **Fix:** rewrite it as a fenced `mermaid` block (text-authored, renders in Markdown, diffs like code).
  Keep bespoke SVG only for a geometry Mermaid can't express (the catalogue's own "Y" figure) — and note
  the reason.
- **Over-elaborate diagram / chartjunk (the less-is-more rule).** **Detect:** a diagram carrying more than
  the idea needs — a C4 four-box context where an "A → B → C" flow says the same thing, a two-or-three-node
  picture that is really one sentence, or ornament that decorates without informing (gratuitous color or
  gradients, 3-D bevels, drop shadows, redundant gridlines, a legend for two colors a label would name).
  **Fix:** reduce to the simplest form that still reads as the thing — Picasso's *Bull*, cutting each mark
  the idea can spare; strip the chartjunk to Mermaid's plain default; collapse a diagram-of-a-sentence back
  to the sentence. Grounds: [`../drawing/diagrams.md`](../drawing/diagrams.md) §"Less is more — the simplest
  form that carries the idea".
- **Inaccessible diagram.** **Detect:** labels too small to read or distinctions carried by color alone;
  no alt text / description (`accTitle` / `accDescr` for Mermaid, `<title>`/`<desc>` + `aria-labelledby`
  for SVG); or an interactive SVG with clickable children marked `role="img"` (which hides them) instead
  of `role="group"`. **Fix:** enlarge labels and add a non-color channel; add a description stating the
  diagram's *content* and takeaway; switch an interactive SVG to `role="group"`. Test by reading the alt
  text alone with the picture hidden — if it doesn't convey the point, the diagram is decoration.

## Pass 6 — Interpretability (catalogue entries only)

Skip this pass for agent-facing docs. Run it only on catalogue entries, against the
**interpretability principle** — an entry must stand alone to an agent with no access to the parent repo.

- **Dangling paths into unshipped trees.** **Detect:** a path into `services/…`, `deploy/…`, `docs/…`,
  `talks-and-notes/…`, or a `` `filename.py` `` this repo doesn't ship. **Fix:** describe the artifact by
  role and shape — "a host-level flock wrapper that serializes the test runner", not the filename.
  Intra-catalogue links (`../<role>/<family>/<mechanism>.md`) are fine — they ship.
- **Bare rule-number citations.** **Detect:** "rule #46", "#29a", any bare `#N`. **Fix:** state the rule's
  *content* — "a project rule that a new event-bus topic must ship an observability entry."
- **Artifact-by-unshipped-filename instead of by role.** **Detect:** the mechanism explained *through* a
  concrete file the reader can't see. **Fix:** state the conceptual mechanism; name a real artifact at
  most once, for grounding, in a way that stays understandable without it.

## Pass 7 — Reality-claim registration (book Discussion / Future prose)

Run this pass only on **book prose that argues about the world** — the Discussion, Implications, and
Future-work material (the Ch-6 backmatter, the end-of-part syntheses, any passage that reaches past the
DocAble case). Skip it for catalogue entries and for tutorial/reference prose that only explains the
apparatus.

**Why this pass exists.** The book carries a mechanized substantiation check: it reads the registered
claim universe (the argument spine + the theory nodes) and flags any registered reality-claim that has no
backing and no honest speculative frame — a **soapbox** claim. That check only sees *registered* claims. A
sweeping assertion sitting in Discussion prose, in no model, is invisible to it. This pass is the human
half of the loop: **it finds the unregistered reality-claims the mechanized check cannot see, so they can
be registered.** Once a claim is registered — with a frame and a backing — the mechanized check holds the
line on it thereafter. The audit finds the orphan; the model keeps it honest. Soft finds it, hard holds it.

**Detect.** Read the passage for a **sweeping claim about the world** — a statement asserted as fact that
reaches beyond the DocAble case and beyond the literature the passage already cites. Three shapes recur:

- **Historical / causal.** A claim about *why* something in the field happened — "the movement arose
  because…", "the field spent decades doing X". It asserts a cause or a history, not an observation of this
  project.
- **Empirical / prevalence.** A claim about what is *generally* true across the field — "practices of this
  kind fail under pressure", "this rarely shows an effect". It quantifies or generalizes over cases the book
  did not measure.
- **Verb-mismatch.** A claim whose verb over-reaches its evidence — prose that says a source *establishes*
  or *proves* something the book's own model records as *convergent* or *situating* evidence. The verb
  claims more than the backing licenses.

For each candidate, confirm one of two things holds, or flag it:

1. It is **registered** in the claim model with a `frame` and a backing — a DocAble datum, a literature
   citation, or a lived field note.
2. It carries an **honest frame in the prose itself** — offered as a hypothesis for replication, scoped to
   the single case, or hedged as a possibility / the author's stated reading.

If neither holds, it is a **soapbox orphan**: a reality-claim, asserted flat, backed by nothing and hedged
by nothing, invisible to the mechanized check. That is the finding.

**What counts / what doesn't.** Aim the pass; do not let it fire on ordinary prose.

- **Counts:** a sweeping historical, empirical, or causal assertion about the field or the world — the
  three shapes above. The test is *"does this assert something a reader could dispute on the evidence, that
  the passage does not back or hedge?"*
- **Does not count:** ordinary connective prose ("so the next section turns to…"); definitions and
  restatements of the book's own terms; a claim already backed by a citation or datum in the same passage; a
  claim already hedged in the prose ("I read this as…", "a hypothesis this case cannot settle", "on this one
  project"); and the author's openly-marked standpoint ("the claim I want to make loudly is…") — that last
  is a *knowing* reality-claim, not a hidden one, but note it so the author can decide to register it as
  such (see the fix).

**Fix.** A soapbox orphan is registered or reframed — three moves, the author's call which:

- **Cite it.** Add a literature citation (or a DocAble datum) that backs the claim, then register the claim
  in the model with that citation bound as its backing. The claim keeps its `reality` frame because it now
  has evidence. Best when the claim is load-bearing and a real source exists.
- **Hedge it.** Reframe the sentence in the prose as offered / single-case / a possibility / the author's
  reading, and register the claim with the matching non-`reality` frame. Best when no clean source exists
  but the claim earns a place as an offered idea.
- **Register it loud, or cut it.** If the author means to assert it flat with no external source, register
  it as a `reality` claim and accept that it shows on the soapbox report — the report is a visibility tool,
  not a gate, and a knowingly-owned assertion sitting there is honest. If it earns neither a cite nor a
  frame nor an owned standpoint, cut it.

**Report shape.** Fold soapbox-orphan findings into the audit report's **first tier** (Correctness &
interpretability). Each finding: quote the sentence, name which of the three shapes it is, and state the
fix as one of the three moves above. A soapbox orphan is a correctness finding, not a voice nitpick — it is
a claim the book asserts and cannot yet stand behind.

## Inset audit — the two-track book chapters

Run this book-specialized check when the document type is an engineering book and a chapter runs a
**pedagogical inset** — the boxed second track that teaches established background so the mainline can carry
the argument ([`document-types.md`](document-types.md) §"Pedagogical insets"). Skip it for the other
document types and for a chapter with no inset. For each inset, ask the seven questions:

- **Needed here?** Is this background needed at *this exact point* in the argument?
- **Visibly separate?** Is it visibly separate from the book's own argument (boxed as a second track, not
  braided into a mainline paragraph)?
- **Expert-skippable?** Can a reader who knows the concept skip it without losing the mainline?
- **Newcomer rejoins?** Can a reader without the background read it and rejoin the argument?
- **One concept, not a survey?** Does it teach one usable concept rather than survey a field?
- **Operationally sound?** Is the simplified account operationally sound — scoped, and teaching no false
  operational rule? This question is the audit hook for the [`voice.md`](voice.md) §"Teach the curious
  engineer" classifier: a simplification that leaves the reader a *wrong* rule is a **correctness** finding
  (first tier), not a voice nitpick; a merely-imprecise-to-a-specialist account is fine once its scope
  clause is present.
- **No mainline repeat?** Does the mainline avoid re-teaching the inset's concept after pointing into it
  once?

**Fix.** A "no" on *needed / visibly-separate / one-concept* is a placement or shaping fix — box the braided
primer, cut a survey down to one concept, or move background the reader does not need here. A "no" on
*expert-skippable / newcomer-rejoins* means the two tracks are not cleanly separated — tighten the mainline
so it reads without the inset, or fill the inset so it stands alone. A "no" on *operationally sound* is a
correctness break — scope the simplification or fix the false rule. A "no" on *no-mainline-repeat* is the
progressive-density fix: compress the second mention to an invocation.

---

## Prioritization — rank the findings

Report findings hardest-first. A voice nitpick on a sentence that also fails interpretability is noise
until the interpretability break is fixed.

1. **Correctness & interpretability (blocking).** Anything from Pass 6 — dangling paths, bare rule
   numbers, unshipped-filename dependence — plus any factual or logical error you spot, plus an
   **inaccessible diagram** from Pass 5 (a picture a reader can't perceive fails the same "reaches its
   reader" bar). These break the passage for its actual reader.
2. **Voice & tells (substantive).** Pass 1 density findings, Pass 2 voice/register mismatches, and the
   **communication-mode** findings from Pass 5 (a shape buried in prose that a diagram should carry, or
   the wrong diagram type). The prose reads as machine-generated, off-register, or picture-starved; fixing
   these is the main editorial work.
3. **House-style & structure (polish).** Pass 3 and Pass 4 — copulas, qualifiers, transitions, headings —
   plus the **bespoke-SVG-where-Mermaid-would-do** finding from Pass 5. Real but lower-stakes; batch them.

Within a tier, order by how much the fix improves the passage, not by reading order.

**Final precision check.** Could any sentence become both more precise and easier to read by replacing an
abstract formulation with the concrete actor, object, and operation? If so, that is a Pass-2 fix — name the
actor and its operation (*the gate rejects*, *the validator checks*), and keep the abstraction only where
the abstraction itself is the subject.

## Output format — the audit report

Emit a report in this shape. Model it on a good editorial review: specific, actionable, quote the before
and give the after.

1. **Verdict — one line.** A single sentence: overall grade plus the dominant problem. *"Solid argument,
   but em-dash-heavy and voiced too abstractly — anchor the claims and vary the punctuation."*
2. **Findings — a prioritized list**, hardest-first per the ranking above. Each item has exactly three
   parts:
   - **Location** — a quoted snippet or a section/line reference so the fix is unambiguous.
   - **Problem** — which pass caught it and why, in one clause.
   - **Suggested rewrite** — the concrete *after*. Quote the before, give the after. Don't say "vary the
     cadence" — show the rewritten sentence. For a Pass-5 finding the *after* is the concrete diagram:
     name the type and give the Mermaid source (or the `role`/alt fix), not just "add a diagram."
3. **What works — keep.** A short list (2–4 items) of what the passage does well, so a revision doesn't
   sand off its strengths. Name the specific move — "the CrowdStrike anchor in ¶2 earns the abstraction;
   keep it."

Keep the report as long as the findings warrant and no longer. If the passage is clean, say so in the
verdict and list only the "keep" items.

## Worked example (before → after)

**Before:**

> The gate is a mechanism that is essential to the pipeline. It blocks bad commits — it catches lint
> failures — it stops broken tests — and it is the load-bearing defense of the whole system. It is very
> reliable and arguably the best part of the design.

**Audit:**

- *Verdict:* Off-voice and tell-heavy — copula, dash-run, bare qualifiers, and selling in three
  sentences.
- *Finding (voice/tells):* "It blocks… — it catches… — it stops…" is a dash-joined tricolon on one beat,
  and the sentence stacks three dashes. → **Rewrite:** "It blocks bad commits: it catches lint failures
  and stops broken tests before they land."
- *Finding (house style):* "is a mechanism that is essential", "load-bearing defense", "very reliable",
  "arguably the best" — copula, reflex label, bare qualifiers, selling. → **Rewrite:** drop them; state
  what it does.
- *Keep:* the three concrete failures it catches (lint, tests, bad commits) — that specificity is good;
  just don't list them as a dashed tricolon.

**After:**

> The gate blocks bad commits: it catches lint failures and stops broken tests before they land. When it
> fires, a regression that would have shipped never leaves the developer's machine.
