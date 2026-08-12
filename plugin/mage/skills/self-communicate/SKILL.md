---
name: self-communicate
description: >-
  Write and diagram engineer-facing prose well — the third partner skill in the
  govern / operate / communicate trio. It governs the prose the fleet AND its
  operator produce: the fleet's docs (a control's description, a mechanism entry, a
  design doc, a runbook, a handoff, a README, a tutorial, an ADR, an API reference)
  AND the operator's own reports to the human (a status report, explaining a
  tradeoff, surfacing a decision — the orchestrator's prose to the user is prose
  too). Use when authoring or auditing any of it. Two legs. PROSE — the rhetoric
  toolkit (classical figures, used with
  variety so the prose doesn't read as machine-uniform), the Diátaxis engineering
  register (tutorial / how-to / reference / explanation), a house lexicon that
  names concepts consistently, the target voice, and an audit procedure that grades
  a passage and emits concrete fixes. VISUALIZATION — technical-diagram types,
  Mermaid-first, with a narrow hand-authored-SVG escape hatch. Also bootstraps a
  house vocabulary by walking a codebase and keeps it living. Use whenever prose
  quality, doc structure, term consistency, LLM-tell density, or a technical diagram
  is in hand.
---

# self-communicate — write and diagram engineer-facing docs well

You are communicating **the way the work is explained** in this repository — the prose and diagrams an
engineer or a coding agent reads to understand it. This is the *communicate* leg of a trio: **govern /
operate / communicate.** [`self-governance`](../self-governance/SKILL.md) is the *harden* leg (the census
of controls and the engine that mints new ones); [`self-operations`](../self-operations/SKILL.md) is the
*operate* leg (running the substrate those controls govern). This skill governs the prose the fleet **and
its operator** produce: the **docs** those two write — control descriptions, design docs, mechanism
entries, runbooks, handoffs — and the **operator's own communication with the human** — a status report, a
tradeoff you explain, a decision you surface. The orchestrator's prose to the user is prose too. Make all
of it clear, consistent, and readable.

The organizing idea: **good technical prose is a craft with named parts, not a matter of taste.** Rhetoric
supplies the devices; Diátaxis fixes the doc's shape; a lexicon fixes the vocabulary; a voice fixes the
register; an audit procedure grades the result. Diagrams are the same craft for shapes prose can't carry.
None of this is invented per document — you reach into a toolkit and apply it.

## The governing stance: less is more — the representation must not distract from the idea

One principle governs every resource below, prose and drawing alike: **the representation is a carrier for
the idea; strip anything that does not carry it.** Three touchstones name the discipline:

- **Hemingway** — economy of words. Plain, concrete, load-bearing prose. No fluffy adjective, no ornamental
  flourish where a plain word carries the idea.
- **Tufte** — the data-ink ratio. A visual aid is the simplest form that carries its idea; strip the
  chartjunk — the gridlines, gradients, and 3-D bevels that decorate without informing.
- **Early Picasso, the bull lithographs** — the eleven-plate *Bull* reduces a bull to a few lines, each
  plate removing what the last could spare, until only the essence remains. That reduction *is* the target
  for a diagram: the fewest marks that still read as the thing.

The stance specializes per representation, and each specialization lives in its own resource rather than
being restated here:

- **In prose** — economy of words; no fluffy adjectives. Reserve flowery, ornamental language for the
  contexts that earn it (a blog post, a keynote) and use it sparingly even there. Repo prose — a reference,
  a runbook, a design doc — is plain. This extends the existing "cut qualifiers / describe don't sell"
  discipline; see [`writing/voice.md`](writing/voice.md) (§"Economy — less is more").
- **In drawing** — the simplest representation that carries the idea. Do not elaborate a diagram if a
  simpler one would read; strip ornament. See [`drawing/diagrams.md`](drawing/diagrams.md) (§"Less is more —
  the simplest form that carries the idea").

The [`writing/audit.md`](writing/audit.md) procedure flags violations of this stance in both legs — a fluffy
adjective in prose, ornament in a diagram.

## The second stance: name the concept, then use the name

A second principle governs both legs: **name the concept, then use the name — reach for the established,
native construct rather than re-deriving it from parts.** A name is a handle. It carries the concept's
meaning, its constraints, and its correct behavior in a single token, so using the name is shorter,
clearer, and less error-prone than re-describing or re-assembling the concept each time it appears. The
failure it prevents is the same in both legs: a concept re-derived from scratch on every appearance drifts,
and a construct hand-stitched from primitives is fragile in ways the native, named form is not.

The stance specializes per representation, and each specialization lives in its own resource:

- **In prose** — use the established TERM and the named design PATTERN, then link it, rather than
  re-describing the idea in fresh words each time. A recognized name — a "circuit breaker", a "state
  machine" — hands the reader the whole concept and its constraints at once. See
  [`writing/lexicon.md`](writing/lexicon.md) (§"How to use this lexicon" — "Name the established term").
- **In drawing** — use the native, named drawing construct rather than stitching one from primitives. An
  SVG `<marker>` with `orient="auto"` *is* an arrowhead: it rotates to its line and pins to the endpoint,
  so it cannot land rotated or off-target the way a hand-placed triangle `<path>` can. Reach for the
  format's own named shape before composing one. See [`drawing/diagrams.md`](drawing/diagrams.md)
  (§"Use the native construct, not stitched primitives").

## The two legs

- **Prose** — the argument, carried in sentences. Five resources, applied in order.
- **Visualization** — the shape, carried in a diagram. One resource, Mermaid-first.

### Prose — the five resources, in order

1. **Rhetoric (the basis).** [`writing/rhetoric.md`](writing/rhetoric.md) — the device toolkit. The
   "LLM tells" (the universal em-dash, the mechanical tricolon, the reflexive "not X, but Y") are
   classical figures, not defects; the tell is *sameness and density*, the same figure on a fixed beat.
   Draw variety from the toolkit so no one figure recurs every beat.
2. **Engineering discourse / Diátaxis (the shape).** [`writing/engineering.md`](writing/engineering.md) —
   fixes the *shape* of a doc via the four Diátaxis modes (tutorial / how-to / reference / explanation).
   Decide the mode first; a how-to written as an explanation confuses the reader. The
   [`drawing/diagrams.md`](drawing/diagrams.md) leg pairs a diagram type to each mode.
3. **Lexicon (the vocabulary).** [`writing/lexicon.md`](writing/lexicon.md) — the house vocabulary of
   engineering terms-of-art, so the prose names an established idea and links it rather than re-describing
   it each time. Pick one word per concept and say it everywhere.
4. **Voice (the sensibility).** [`writing/voice.md`](writing/voice.md) — the target register with verbatim
   exemplars. Voice says what the prose should *sound* like; the engineering register says what *shape*
   it should take.
5. **Audit (the procedure).** [`writing/audit.md`](writing/audit.md) — a run-in-order procedure that grades a
   passage against all of the above and emits concrete fixes. Run it last, over the drafted prose.

### Visualization — Mermaid-first

[`drawing/diagrams.md`](drawing/diagrams.md) — the standard technical-diagram types, when to reach for each,
and how to realize one. **Default to Mermaid** (it is text, it renders in Markdown, it diffs like code);
drop to hand-authored SVG only for a geometry Mermaid can't lay out, and justify the escape. Prose carries
the argument; a diagram carries the *shape* — a structure, a flow, a lifecycle, a schema. When the thing
you are explaining has a shape, draw it.

Two peers hold the *data*-figure styles, where the content is a measurement rather than a system shape.
[`drawing/charts.md`](drawing/charts.md) — the house style for data charts (serif, three round ticks, no
title/axis labels, a restrained two-color palette, Tufte data-ink; drawn from committed data, never mocked).
[`drawing/tables.md`](drawing/tables.md) — the booktabs table style (three horizontal rules, no vertical
rules or cell borders; horizontal rules group, whitespace separates). Chart a trend, table a grid of values.

A fourth peer, [`drawing/figures.md`](drawing/figures.md), governs *editorial judgment* rather than diagram
type: what a teaching figure should show, how much of it, and how it relates to the figures around it in
the book — a figure is a model for teaching the reader, never a rendering of the system's own models.
Apply it before picking a diagram type — it decides what the figure says; `diagrams.md` decides how to
draw it.

## How to use this skill

1. **Name the genre and the mode first.** What kind of doc is this — tutorial, how-to, reference,
   explanation, ADR, runbook, mechanism entry? The mode ([`writing/engineering.md`](writing/engineering.md))
   decides the shape before you write a sentence.
2. **Draft in the house voice, with varied devices.** Apply [`writing/voice.md`](writing/voice.md); reach into
   [`writing/rhetoric.md`](writing/rhetoric.md) for figures, and vary them so nothing recurs on a fixed beat.
3. **Name concepts from the lexicon.** Use [`writing/lexicon.md`](writing/lexicon.md) — one established term
   per idea, linked; don't coin a synonym for a concept that already has a name.
4. **Draw the shape where there is one.** If the content is a structure, flow, lifecycle, or schema, add a
   diagram per [`drawing/diagrams.md`](drawing/diagrams.md) — Mermaid unless the geometry forces SVG. If the
   figure teaches a concept rather than documenting the system's own model, apply
   [`drawing/figures.md`](drawing/figures.md) first — what to show, how much, one job per figure.
5. **Audit before you ship.** Run [`writing/audit.md`](writing/audit.md) over the draft and apply its fixes.

## Bootstrap the lexicon from a codebase walk — then keep it living

The lexicon ships a **portable base** (terms with an established name in the wider discipline). Your repo
also has a **house dialect** — its own coinages and the terms it reuses. You do not invent that table; you
*mine* it, then keep it current.

1. **Bootstrap by walking the codebase.** Follow the bootstrap recipe in
   [`writing/lexicon.md`](writing/lexicon.md) (§"Bootstrap recipe — walk your codebase"): sample your sources
   (the house-rules doc, a handful of design docs, your typed enums / registries / schema constants),
   extract every term you use with a specific meaning more than once, classify each as **portable** (link
   the established name) or **house** (note the standard concept it renames), and draft the table.
2. **Confirm with the maintainer.** The maintainer ratifies the preferred term and the definition — a
   lexicon nobody agreed to won't be used.
3. **Keep it living.** Re-walk periodically and whenever vocabulary drifts: a new coinage, or two words for
   one idea, is the signal to add or fix a row. **self-communicate owns the lexicon** — update it when you
   coin a term or notice drift. Keep the portable base shared; keep the house dialect local (an outside
   adopter who copies your coinages inherits terms that mean nothing in their repo).

## Notes

- **The prose the other two skills produce is this skill's work.** The controls, mechanism entries, and
  design docs written under [`self-governance`](../self-governance/SKILL.md) are prose; the runbooks,
  handoffs, and banking docs written under [`self-operations`](../self-operations/SKILL.md) are prose too.
  Write all of them in the engineering register. Going the other way: when your writing surfaces a recurring
  failure, **hand it to the [`self-governance`](../self-governance/SKILL.md) skill** to convert into a
  control; when it surfaces an operational break, **route it via the [`self-operations`](../self-operations/SKILL.md)
  skill**. The lexicon's **Governance & controls** and **Operations** clusters are the shared vocabulary all
  three skills reason in — keep those terms consistent across the trio.
- **This skill is soft.** It aims the writer at a craft; it does not itself block. The one hard control it
  suggests is running the audit procedure as a gate over prose before it ships.
- **Grade the prose, not the writer.** The audit procedure grades a passage and emits fixes. It is a
  checklist an agent runs, not a verdict on the author.

## Local adapter (plug points)

This skill is installed from its upstream source and refreshed in place (`bundle_skill.py --install` /
`--refresh`). A refresh **overwrites every upstream file**, so put your local additions where the refresh
never looks. Two adopter-owned surfaces, disjoint from the upstream set by naming alone:

- **File overlays** — for a listed upstream file, create the named `*.local.md` sibling. The agent reads it
  as an **APPEND** after the upstream file. There is no override mode — replacing an upstream file wholesale
  is a fork, out of scope for the adapter. Declared overlays:
  - `writing/lexicon.md` → `writing/lexicon.local.md` — your **house vocabulary** rows, appended to the
    lexicon's portable base. This catalogue ships its own DocAble house dialect here as the worked example.
- **Directory drop-in** — any file you place under `local/` is adopter-owned: the agent reads it on the
  topic it names, and upstream never ships into `local/`. Use it for a standalone house style note this
  skill does not already carry.

A refresh never reads, writes, or deletes a `*.local.md` file or anything under `local/`, so your local
tinkering survives every upstream update untouched. When you consult the lexicon, read `writing/lexicon.md`
and its `writing/lexicon.local.md` overlay together — the portable terms plus your house dialect.
