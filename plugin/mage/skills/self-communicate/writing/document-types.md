# document-types.md — the document-type taxonomy

This is an **agent-facing** style doc — a resource of the `self-communicate` skill, not a catalogue entry.
It is not rendered to HTML or served.

[`engineering.md`](engineering.md) fixes the shape of one *page or section* through the four Diátaxis
modes — tutorial, how-to, reference, explanation. This file works one level up: it fixes the shape of a
**whole document** — a book, a tutorial series, a reference manual, a design doc, a blog post. A document
type is a *composition* of modes plus a set of artifact-scale disciplines Diátaxis says nothing about: an
arc across chapters, a thesis that recurs, a frame that opens each chapter, a visual budget, a
section-length cap, a conclusion that closes the loop.

Name the type first. It tells you which disciplines apply before you write a sentence — the same way naming
the Diátaxis mode tells you the section's shape.

## The base — what every technical document owes its reader

These hold for every type below. The specializations extend this base; they never repeal it.

- **One job per document.** A document has a reader with a need. State the need it serves in the first
  paragraph, and serve that one need. A reference that keeps pausing to persuade, a tutorial that detours
  into theory — both fail the same way (the mixed-mode failure Diátaxis names).
- **Orient before detail.** The reader gets the map before the territory: what this is, who it is for, how
  it is organized. A reader who stops after the opening still knows what the document is.
- **The house voice and the rhetoric toolkit apply throughout.** Plain diction, concrete anchor before
  abstract claim, claim paired with caveat ([`voice.md`](voice.md)); varied figures, no one figure on a
  fixed beat ([`rhetoric.md`](rhetoric.md)). These are type-independent.
- **Draw the shape where there is one.** A structure, a flow, a lifecycle, a schema wants a diagram, not a
  paragraph tracing it ([`../drawing/diagrams.md`](../drawing/diagrams.md)). How *much* a type leans on
  visuals is a specialization; that it uses them where prose can't carry a shape is the base.
- **Name concepts once, from the lexicon.** One established term per idea, linked
  ([`lexicon.md`](lexicon.md)) — so the reader looks a concept up instead of re-learning it each time it
  recurs.
- **Audit before ship.** Run [`audit.md`](audit.md) over the draft. The audit consults the document's type
  and applies its specialized checks (see §"How the audit uses this file").

## The document-type layer

Five types. Each row names what the type **optimizes for** (the reader need that dominates every other),
its **dominant Diátaxis mode(s)**, and the **specialized rules** that the base does not carry. The
engineering book gets the fullest treatment because its disciplines are the most artifact-scale — a single
chapter read alone can look fine while the book fails.

### Engineering book

**Optimizes for** a reader who reads front-to-back once and returns to parts later — carrying a small
number of ideas across a long argument, chapter by chapter, without losing the thread.

**Dominant mode** explanation, with reference sections (an appendix, a glossary) and the occasional how-to
(a runbook chapter). A book is not one mode; it is an *ordered composition* of them under an arc.

Use [`textbook.md`](textbook.md) for paragraph-level teaching, explanatory length, and calibrated examples.

**Specialized rules:**

- **A thesis or two, woven throughout.** A book earns its length by developing a claim the reader could not
  have gotten from a blog post. Name the thesis — one, at most two — and return to it across chapters, so
  each chapter is visibly an instance of the same argument, not a fresh essay. *(This book names two: the*
  ***Modeling Thesis*** *— bind intent to implementation with a typed model, which optimizes the agent's
  context window — and the* ***Alignment Thesis*** *— an environment-enforced control keeps implementation
  aligned with intent. Every chapter is one of the two worked out.)* A thesis that appears in the preface
  and never again is a subtitle, not a thesis.
- **A narrative arc: setup → development → implications.** The parts move: establish the problem and the
  vocabulary, develop the machinery, then draw the implications and tie up. A reader should feel the book
  going somewhere, not sample a pile of independent notes. The order of parts *is* the argument.
- **Each chapter opens with a frame.** The first paragraph says what this chapter adds to the argument and
  how it connects to the last — the map before the territory, at chapter scale. A chapter that opens cold
  on a subsection heading makes the reader reassemble the connection.
- **At least one visual per chapter.** A book chapter carries a shape — an architecture, a lifecycle, a
  loop, a taxonomy. A chapter of unbroken prose is a chapter that made the reader hold a diagram in their
  head. Budget one figure minimum; more where the chapter has more shapes.
- **Section-length discipline.** A section that runs past a cap without a subheading, a list, or a figure
  is a wall of text. Break it: the reader needs a handhold every few paragraphs. Pick a defensible cap
  (this book's structural lint starts at ~400 words / 6 paragraphs per heading-to-heading section) and hold
  it.
- **A conclusion that ties back to the thesis.** The last chapter returns to the named thesis and shows the
  book delivered on it — the arc closing where it opened, one level richer. A book that stops instead of
  concluding leaves the reader holding chapters they must synthesize themselves.
- **Recur when it teaches.** Returning to an example can test a distinction, connect ideas, or let the
  reader practice an inference. A chapter-ending synthesis can turn a developed argument into useful
  handles. Keep this productive repetition; cut repeated claims that do no additional explanatory work.
  Judge the contribution, not merely the repeated wording or level of abstraction.
- **Some chapters offer two reading paths.** The mainline develops the argument with enough explanation
  and examples to stand on its own. Optional insets can teach background or work through a production case
  in greater depth (see §"Pedagogical insets" below). A production case need not stay in the mainline
  merely because it supplies the book's evidence. Introduce the case where its details become useful,
  and give readers enough context to follow it without assuming they already know the system.

  The test is not "could this material be moved elsewhere?" It is **"does the reader need it at this point,
  and can they choose how deeply to enter it?"** Progressive density applies to the repeated book concept,
  not to a newly-introduced outside one ([`voice.md`](voice.md) §"Progressive density").
- **Field notes are sources, not artifacts.** The author's raw field notes are where a fact comes from, not
  a thing the book discloses. Never gesture at the private artifact — "the field notes are blunt about
  this," "a caution the notes earned the hard way" — because the reader then has to take your word for a
  document they can't see. Two ways to use a note instead, by whether it carries a concrete incident. The
  **hands-on move, preferred when there is a real story:** lift the incident into a `> ### Field note —
  <short title>` inset (it renders as a sidebar) that *shows* the specific moment — "he did development on
  the kitchen counter while the family slept" — keeping the vividness while the main text carries the
  lesson. **De-reference to a plain statement** only when the mention is vague meta with no concrete
  example to show; then state the fact or lesson directly and cut the reference. When in doubt, reach for
  the inset.
- **Self-referential restraint.** Name the thesis and name the real system (DocAble); do not turn the
  thesis cutely back on itself. "That is the book's own thesis, so it is fair to turn it on the system that
  produced it" is meta-commentary that distracts from the content it is introducing — cut it and just
  present the views. This is the artifact-scale twin of the Pass-4 self-narrating-structure and
  trailing-remark findings in [`audit.md`](audit.md): the book should deliver its argument, not narrate the
  fact that it is delivering one.

### Tutorial

**Optimizes for** a beginner reaching a first concrete success — building confidence, not coverage.

**Dominant mode** tutorial (study-oriented, practical).

**Specialized rules:**

- **Task-ordered, not thesis-ordered.** A tutorial has *no thesis* — this is the sharpest contrast with the
  book. Its spine is the sequence of steps that reach the win, ordered by what the reader does next, not by
  an argument being developed. Do not smuggle a thesis in; it slows the reader down.
- **One running example, carried the whole way.** Introduce it once, thread it through every step. A
  tutorial that switches examples resets the reader's mental model each time.
- **A visible win at the end.** The reader must *see* the result — the served page, the passing test, the
  green build. The payoff is the tutorial's engine; without it the reader never learns whether they
  succeeded.
- **Explain each line as it arrives; defer the theory.** Motivation that would strengthen a book chapter
  weakens a tutorial. Link out to the explanation; keep the tutorial moving.

### Reference / API doc

**Optimizes for** a competent reader looking one fact up fast — completeness and scannability, not
narrative.

**Dominant mode** reference (work-oriented, theoretical).

**Specialized rules:**

- **Exhaustive and scannable — no arc.** A reference has *no narrative order*. Every symbol, endpoint, or
  flag gets an entry; the reader arrives by search or by an alphabetized/grouped index, never by reading
  front to back. Optimize for the reader who lands mid-document.
- **Uniform entry shape.** Every entry has the same fields in the same order (signature · parameters ·
  returns · errors · example). Uniformity is what makes a reference scannable — the reader learns the shape
  once and reads every entry by reflex.
- **Definition, not persuasion.** Term · genus · differentia, then how it relates to neighbours. No
  motivation, no worked argument — a reference defines, it does not walk a *why*.
- **A runnable example per entry where it applies.** The one exception to "no prose": a short, correct usage
  snippet answers the question the signature raises.

### Design doc / ADR

**Optimizes for** a reader deciding whether a design is sound — the tension, the alternatives, and the
tradeoff, so the decision can be trusted and, later, revisited.

**Dominant mode** explanation.

**Specialized rules:**

- **State the design tension first.** Open with the forces in conflict, before the chosen shape. A design
  doc that leads with the answer robs the reader of the reasoning that justifies it.
- **Name the alternatives you rejected, and why.** The rejected options are the doc's most reusable
  content — they stop the next reader re-proposing a path already ruled out.
- **Concede the tradeoff in the same breath as the choice.** Every design costs something. State the cost
  where you state the decision, in the claim-plus-cost cadence of the technical register.
- **Walk the second-order dynamics.** For anything stateful, concurrent, or retried, trace what happens at
  tick T+1, T+10, T+100 — the failures live in the dynamics, not the static structure.

### Blog post / keynote

**Optimizes for** a reader you must *persuade* — holding attention and landing one memorable idea, not
completeness.

**Dominant mode** explanation in the discursive register (see [`voice.md`](voice.md) §"Three registers").

**Specialized rules:**

- **One idea, hard.** A post makes a single point land. Coverage is the book's job; the post trades breadth
  for a claim the reader remembers.
- **A hook up front, a payoff at the end.** Open on the concrete anchor — the number, the incident, the
  surprising claim — and close on the turn it sets up. This is the one type where an extended analogy and a
  well-placed flourish earn their keep (used sparingly even here).
- **Persuasion is licensed — briefly.** The discursive register is right here and wrong in a reference. Reach
  for direct address, the rhetorical question, the objection raised and rebutted. Keep it tight: one
  flourish that lands beats three that decorate.

## Pedagogical insets — the optional second track

An **inset** is a boxed, skippable second reading track. It can supply established background or develop a
production case in depth. The mainline still owes the reader the explanation and examples needed to follow
its argument; the inset lets the reader examine a concept or case more closely.

### Background primers

**Use a background primer when all three conditions hold:**

1. the concept is needed to understand the worked example;
2. it is established *background*, not the book's central contribution;
3. some intended readers already know it (so inlining it would bore them, and cutting it would lose the
   newcomer).

**A background primer should:**

- answer one literal question;
- begin with the plain intuition;
- carry one concrete example;
- give only the formalism the surrounding chapter needs;
- end by stating what the reader should now be able to recognize or check;
- not pretend to be a complete treatment.

The surrounding prose points into the primer **once**, then uses the concept's canonical name without
re-teaching it (the progressive-density discipline, [`voice.md`](voice.md)). **Primer titles are literal
questions or definitions** — "What is an invariant?", "State properties versus sequence properties", "What
does bounded model checking establish?" — not an ornamental title like "A brief mathematical excursion." An
inset that teaches a simplified account still owes the [`voice.md`](voice.md) §"Teach the curious engineer"
test: the simplification must be scoped and must not teach a false operational rule. The audit runs an
inset-specific check over these ([`audit.md`](audit.md) §"Inset audit").

### Worked-case insets

Use a worked-case inset when a small example can teach the main idea and the production system adds a
useful failure, constraint, or design decision. Introduce what that part of the system does and the
question being answered before its local terms, identifiers, and machinery. Include the model or diagram
the explanation relies on, then work through a concrete sequence or decision. An earlier introduction of
the product does not supply context for every subsystem.

Read the chapter both with and without its optional insets. After an inset, name any production fact still
needed instead of referring to “this model” or “the implementation” when the referent exists only inside
the box. On the full reading path, the case should add explanation; repeating the mainline's conclusion
and qualifications does not earn another example. The [`audit.md`](audit.md) inset audit checks both paths.

## The contrast, stated plainly

The types differ most in two dimensions the base leaves open: **is there a thesis?** and **is there an
arc?**

| Type | Thesis? | Arc / order | Visual budget | Reader enters |
|---|---|---|---|---|
| Engineering book | Yes — 1–2, woven | Setup → development → implications | ≥1 per chapter | Front to back, then returns |
| Tutorial | No | Task order (steps to a win) | As needed for a step | At the start, once |
| Reference / API | No | None — scannable, exhaustive | Per-entry, optional | Mid-document, by search |
| Design doc / ADR | No (a decision, not a thesis) | Tension → alternatives → choice | The shape being decided | To judge one decision |
| Blog / keynote | One idea, not a developed thesis | Hook → payoff | One, if it lands | At the top, must be held |

The book and the tutorial are the sharpest pair. A book is *thesis-ordered*: the parts advance an argument,
and a chapter read out of order loses something. A tutorial is *task-ordered*: the steps reach a win, and
there is no argument to lose — only a sequence to follow. Confusing the two produces a book that reads as a
pile of how-tos, or a tutorial that stalls to develop a thesis the beginner did not ask for.

## How the audit uses this file

The [`audit.md`](audit.md) procedure consults the document's type before it grades. Name the type, then
apply that type's specialized rules on top of the type-independent passes:

- **A book** — check the thesis actually recurs across chapters (not just the preface); each chapter opens
  with a frame; each chapter carries at least one visual; no section blows the length cap; the conclusion
  returns to the thesis. For a chapter that runs a background primer or worked-case inset, run the
  **inset audit** ([`audit.md`](audit.md) §"Inset audit") over both reading paths. Several of the
  book-level checks are mechanical enough to enforce with a structural lint over the built book — that lint
  is the audit's automated arm; the audit runs the judgment the lint can't.
- **A tutorial** — check there is no smuggled thesis, one running example, a visible win.
- **A reference** — check entry-shape uniformity and exhaustiveness; flag any persuading prose as
  register drift.
- **A design doc** — check the tension leads, the alternatives are named, the tradeoff is conceded.
- **A blog/keynote** — check it lands one idea and that the licensed flourish stays sparse.

A finding that a book chapter lacks a visual, or that its thesis never recurs, is a **type-level** finding —
it does not show up reading one chapter in isolation, which is exactly why the type has to be named before
the audit begins.

### Suppressing a book-lint finding — the inline `noqa` convention

The structural book-lints are audit-only, so a false positive or a judged-intentional exception never
blocks. But an unexplained finding that recurs every run is noise. To silence one deliberately, place an
inline HTML comment in the chapter **source** `.md` (authors edit source, not generated HTML), mirroring
the repo's `# noqa: <name> — <reason>` convention:

```
<!-- noqa: <lint-name> — <reason> -->
```

- **A reason token after the em-dash (or a whitespace-flanked hyphen) is required.** A bare
  `<!-- noqa: book-visual -->` does not suppress — it is reported as a malformed suppression, so a typo
  can't silently disable a check. This mirrors the repo rule that every `noqa` carries a justification.
- **The comment silences one lint in the file it sits in.** The lint names are the bracketed tags in the
  book-lint set: `book-links`, `book-visual`, `book-section-cap`, `book-thesis`, `book-figure`,
  `book-placeholder`, `book-delimiters`, `book-headings`.
- **A per-section lint can be scoped to one section** with `| <heading-text>` before the reason:
  `<!-- noqa: book-section-cap | The velocity curve — a single unbroken arc reads better here -->`. Without
  the scope, the suppression covers every finding of that lint in the file.
- **Suppressed findings stay visible.** The audit report lists them in a separate "Suppressed findings"
  section with their reasons — silencing hides a finding from the active count, never from the reader.

Reach for a suppression only when the exception is genuine — a chapter that is a pure prose bridge with no
shape to draw (`book-visual`), a section whose one-arc structure earns its length (`book-section-cap`), a
deliberately unbalanced delimiter in a worked example (`book-delimiters`). A finding you would actually fix
is not a suppression candidate.
