# AGENTS.md — editing the Teach with MAGE course companion

Operational rules for agents editing anything under `course/`. The repository-root `AGENTS.md`
covers editorial folds on the **book**; this file covers the **course**. Read
[`README.md`](README.md) first for what this directory is and how the published site is generated
from it.

## Reading lists

The reading list of a unit lander is a set of **choices**, not a syllabus with a compliance tier.

- **Do not classify readings as required, optional, follow-up, further, or recommended.** Students
  sample from the list. A heading such as "Further reading", "Further depth" or "Optional
  reference" tells a student which entries to skip, which is not the intent and is not how the
  instructor assigns work. Organize readings under headings that name a **subject or a lecture**,
  so every entry sits in the same tier.
  The only exception is a section that exists for a genuinely distinct purpose, applied
  consistently across the handbook — not a convenience bucket for entries that felt less central.
  **The rule covers four surfaces, not just the heading.** A tier moved into prose is still a tier:
  - the group `heading:`;
  - the group `note:` — "Only the Cockx introduction is required" and "If you read only one of
    these, read the second" are skip-signals in prose;
  - an item's `locator:` — "multicolumn indexes optional" carries the word into the rendered
    citation;
  - the schema's top-level `readings.optional:` block, which the site hook renders as a bold
    **"Optional / further reading"** label. Fold its entries into a subject-named group.
  Say what a reading offers, not how much of it a student may skip. If one source is a better
  starting point, make that a claim about the source rather than a tier: "Cockx introduces the
  method most directly" ranks without demoting.
- **Each annotation is a coherent paragraph of roughly 3 to 5 substantial sentences**, adjusted to
  the material. It states what intellectual contribution the source makes, what a student should
  attend to, and how it bears on the unit's engineering decisions.
  - A one-line gloss ("Discusses the nonlinear scaling of teamwork.") is too thin to guide anyone.
  - A 160-word catalogue of everything in the source is too long, and reads as generated.
  - An entry with no annotation at all is a defect, not a terse style.
- **Vary the intellectual action, not merely the opening verb.** Repeating "Read it for…" down a
  list is the tell of a generated catalogue. Some entries should open with a substantive claim
  about the source rather than an imperative.
- **Prompts must be specific and answerable from the reading.** "Which resource is saturated when
  CPU remains idle?" rather than "Reflect on the importance of performance."
- **A reading choice is not a lecture topic.** Do not assign a paper because it appears on a slide.
  A reading earns its place by offering an independent perspective, a concrete method, or a deeper
  worked example than the lecture provides.
- **Citations must be verifiable.** Link the source directly, check the link resolves, and cite
  specific sections rather than a whole book when the book is long. Do not invent a section number,
  a page range, or a bibliography entry; if a locator cannot be confirmed against the actual
  document, leave it out and say so.

The full style guidance, including the worked reference example and the audit procedure, is
[`reading-annotation-style.md`](reading-annotation-style.md).

## Before editing a lander

- The front-matter schema is fixed: `title`, `sessions`, `readings.groups`, `exercises`,
  `materials`, `labs`. Preserve it. Every `{exercise:…}` and `{lab:…}` token must resolve to a slug
  present in that file's front matter.
- Every `cite:` key must resolve in `book/references.bib`; this is a blocking check. Adding an
  entry to the bibliography makes the rendered citation cache stale, so run
  `python3 book/render_citations.py` in the same change. The cache is `book/data/citations.json`.
- Landers carry a `status:` field. A lander in `draft` is skipped by some checks, so a clean run
  does not mean a lander was examined.

## House voice

Declarative, concrete, economical. No exhortation, no slogans, no meta-commentary about the
document itself. Avoid em dashes. The course materials are the instructor's; do not attribute an
idea, example, or recommendation to an AI system.
