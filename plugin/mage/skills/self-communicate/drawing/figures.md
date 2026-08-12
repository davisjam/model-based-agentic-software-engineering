# figures.md — curating a teaching figure

This is an **agent-facing** style doc (the drawing leg of the `self-communicate` skill, beside
[`diagrams.md`](diagrams.md), [`charts.md`](charts.md), and [`tables.md`](tables.md)), not a catalogue
entry. It is not rendered to HTML or served. `diagrams.md` decides **which diagram type** carries a shape
and how to realize it; `charts.md` and `tables.md` do the same for a measurement and a grid of values. This
doc governs a different axis: **editorial judgment** — what a teaching figure should show, how much of it,
and how it relates to the figures around it — independent of which diagram type ends up carrying it. Apply
it first, to decide what the figure says; apply [`diagrams.md`](diagrams.md) second, to decide how to draw
it.

Read it alongside [`../writing/voice.md`](../writing/voice.md) (§"Figure captions carry
implications/interpretation, not just description" — the caption rule this doc's captions obey) and
[`diagrams.md`](diagrams.md) (§"Less is more — the simplest form that carries the idea" — the visual-economy
stance this doc specializes for pedagogical *content*, not just ornament).

---

## The governing line

**A figure is a model for teaching the reader, not a rendering of the system's own models.** Its subject is
the real system; its shape belongs to the lesson, not the artifact.

The visual target: an engineer drew the minimum diagram necessary to explain one property on a whiteboard,
and a professional designer rendered that diagram in house style. A figure should never look like the
repository was asked to draw itself.

That has one sharp, non-obvious consequence. A tool dump — a DOT/Graphviz render, a Doxygen call graph, a
generated UML export — looks like evidence *for* the point, because it comes straight from the real system.
It is exactly backward. A book arguing that intent must be made explicit and modeled before it can be
aligned has to model its own evidence, not merely preserve it. A dumped artifact does the opposite: it keeps
every entity the tool happened to enumerate and drops the one thing a reader needs — the question the figure
exists to answer. Pasting the dump doesn't just look worse; it violates, on the page, the argument the page
is supposed to be teaching.

## Redraw everything — no pasted tool output

Never paste, or lightly clean up, and ship as a figure:

- **DOT/Graphviz output** — a dependency or call graph a tool laid out for itself, not for a reader.
- **Doxygen diagrams** — generated class or include graphs.
- **UML generated from source** — a reverse-engineered class diagram.
- **Raw architecture diagrams** — an infra or deployment tool's own rendering.
- **Screenshots of model files** — a JSON/YAML dump, a database schema browser.
- **Giant state-machine renderings** — every enum value and every transition a code generator found.

These are evidence for the author, gathered while researching the figure. They are not publication
figures. Redraw the property they demonstrate from first principles, in the house diagram vocabulary
([`diagrams.md`](diagrams.md)) — restrained geometry, consistent typography, generous whitespace, the same
small set of semantic line and box treatments used everywhere else in the book. The test is not fidelity to
the tool's output. It is fidelity to the engineering property being taught.

## Prefer under-detail — the removability test

State it as a rule, not a preference: **if removing an element does not weaken the engineering claim the
figure demonstrates, remove it.** A figure earns every box and every edge; nothing sits in a teaching figure
because the production system happens to have it.

A service-connectivity figure teaching "connectivity is a declared allow-list" does not need thirty service
entities to make that point — six boxes and one forbidden edge make it faster and it sticks harder:

```
   [Web] → [Editor] → [Worker] → [Render]
                           ├────→ [OCR]
                           └────→ [GenAI]
              (unshown edges: forbidden)
```

The full production graph stays available in the supporting repository for a reader who wants it. The
figure's job is the property, not the inventory.

## One job per figure

Impose a test on every figure before drawing it. Complete the sentence: **"After this figure, the reader
understands ___."** If the honest completion contains an "and," split the figure or cut the second half —
one figure, one job.

A structural figure earns the sentence "ordinary code reaches the format library only through a typed
seam." A policy figure earns "connectivity is a declared allow-list, not an emergent property of what code
happens to call." A lifecycle figure earns "failure is terminal, not an implicit retry." Each is one clean
sentence. A figure whose honest sentence needs two clauses is teaching two lessons in one picture, and the
reader keeps neither cleanly.

## Real, not complete

A teaching figure is a real model of the system, rendered at pedagogical resolution — not a toy example, and
not a complete system diagram either. Say so where a reader might reasonably object that the real system has
more parts: a short caption line does the work —

> Simplified view of the production service-connectivity model. Only the relationships needed for this
> discussion are shown.

This is a *scope* sentence, distinct from the interpretive sentence [`voice.md`](../writing/voice.md)
requires of every caption (§"Figure captions carry implications/interpretation, not just description") — a
caption still owes the reader the conclusion to draw, not only the disclaimer that the picture is partial.
Use both: the scope line heads off the "the real system is bigger" objection; the interpretive sentence
still carries what the figure means.

## One visual grammar across model classes

Establish a small vocabulary once, and refuse to expand it casually:

- an **entity box** — a thing in the model;
- a **solid arrow** — a permitted or actual relationship;
- a **dashed arrow** — an observed or derived relationship;
- an **arrow struck with X** — a prohibited relationship;
- a **small bracketed annotation** — a property or obligation attached to an entity or edge.

Reuse it everywhere. Don't let a structural figure read as UML, a behavioral figure read as a textbook state
machine, a measurement figure read as an observability dashboard, and a documentation figure read as a
data-flow diagram — four different notations for four chapters of one book. Specialized notation earns its
place only where the notation itself carries the lesson (a lifecycle genuinely needs states and transitions);
even then, keep the same typography, stroke weights, labeling convention, and whitespace the rest of the book
uses. This is the pedagogical instance of [`diagrams.md`](diagrams.md)'s "One style source for a figure-set"
— there for a single set of diagrams sharing a theme, here for every model class the book draws.

## The question above the figure

Consider a recurring, understated marker that names the engineering question the figure answers, placed
above or within the figure itself:

> Question: Where may document mutation occur?

...followed by the figure that answers it. Used consistently, that pairing teaches "the question determines
the model" almost subliminally — question, then representation, every time. Use it consistently across a
figure set or not at all; an intermittent marker reads as decoration rather than a taught pattern.

## Reprise the objects; don't redraw them

This is the instruction most worth protecting. When a later part of the book gives an earlier model new
authority — enforcement, comparison, a gate — **show the same objects from the earlier figure**, and add the
new machinery around them. Do not invent a new figure with new labels for the same underlying model.

Earlier, teaching the model:

```
[Worker] → [OCR]
```

Later, teaching that the model now has authority:

```
 declared model              implementation
[Worker] → [OCR]            [Worker] → [OCR]
      │                            │
      └─────────────┬─────────────┘
                     ▼
                  COMPARE
                     │
                 drift? → BLOCK
```

Reprising the boxes, rather than redrawing them, is what visually proves the claim: authority is *added to*
the model, not restated in a new one. A fresh figure with fresh labels makes the same prose claim but loses
the proof.

## History figures are a distinct genre

Some figures earn a place outside the structure/behavior/data taxonomy: they show how a mechanism came to
exist, not what the system is. A history figure is a short chain — cause, then response, then the next cause
it exposed:

```
silent corruption → library policy → typed seam → raw-access ban → gate integrity
```

Draw it in the same restrained house grammar as every other figure — same type, same weight, same
whitespace — but let its shape be a linear chain, not a system model. A history figure's job is showing an
evolution; conflating it with an architecture figure (by, say, drawing it as a state machine) muddies both.

## Resist figuring everything

Aim for a small number of genuinely load-bearing figures, not one per subsection and not one per production
model artifact. The test before drawing any figure at all:

**Does spatial arrangement convey something prose does not?**

A typed seam: yes — the picture shows what is severed from what. A declared allow-list: yes — the picture
shows what connects to what. A state machine: yes — the picture shows which transitions don't exist. A list
of entities and their attributes: no — that is a table ([`tables.md`](tables.md)), not a figure. When the
honest answer is no, cut the figure and say it in three sentences or a four-row table instead.

## The visual target, restated

Every rule above serves one picture: **an engineer drew the minimum diagram necessary to explain one
property on a whiteboard, and a professional designer rendered that diagram in the house style.** A figure
that looks like a tool's own output — a DOT dump, a Doxygen graph, a giant generated state machine — has
failed this test regardless of how accurate it is. Accuracy to the artifact is not the goal; fidelity to the
question is.

---

## The short version

A figure teaches a property; it does not render the system's own models. Redraw everything in house style —
never paste a DOT/Doxygen/UML/screenshot dump. Prefer under-detail: if cutting an element doesn't weaken the
claim, cut it. Give each figure one job — one honest "after this figure, the reader understands ___"
sentence, no "and." Say plainly that a figure is real but not complete; let the caption carry both the scope
and the interpretation. Keep one small visual grammar across every model class the book draws, and consider
a consistent question-above-the-figure marker. When a later part gives a model authority, reprise its
figure's objects and add machinery around them rather than redrawing. Treat history figures — how a
mechanism came to exist — as their own genre, styled the same but shaped as a chain. And resist figuring
everything: draw only what spatial arrangement says that prose can't.
