# Site content-alignment audit

A whole-site walk. Every conceptual framing on the published site is listed, mapped to the book model it
should project, and graded. The design it audits against is [`SITE-VIEW.md`](SITE-VIEW.md); the standing
rule is **book coverage ⊇ site framings** (`CLAUDE.md`).

Three questions drive the audit:

1. **(a) Site framings with no model backing** — a conceptual card whose claim traces to no model record
   and to no book chapter. This is the gap the projection thesis forbids.
2. **(b) Core model elements the site does NOT project** — a modeled concept, outcome, definition, or
   thesis the site omits. Some omissions are by policy; the audit separates policy from oversight.
3. **(c) Drift / mismatch** — a site framing whose backing exists but is stale, misfiled, or joined on
   the wrong key.

Snapshot: **71 mechanisms · 4 definitions · 9 projected outcomes · 3 principles · 13 concept records.** The
site is in good alignment. The findings below are small and named, not structural.

## The framing census (the worklist)

Each landing family, walked. "Backing" names the model element the framing projects or traces to.

### Derived projections — content read from a model at build time

| Framing (family / card) | Model backing | Status |
|---|---|---|
| The four definitions (`def-model`, `def-agent`, `def-engineering`, `def-software-engineering`) | `book/data/definitions.json`, one record each | **Projected.** Rendered by `_landing_definitions`; `check_definitions_site` pins it. |
| The learning outcomes (`outcome-book-*` ×3, `outcome-part-*` ×6) | `book-models/outcomes.json` selected by `outcomes-site.json` | **Projected.** Rendered by `_landing_outcomes`; `check_outcomes_site` pins it. |
| The models reading view (linked from the outcomes section) | `outline.json` + `outcomes.json` → `models-view.html` | **Projected.** Rendered by `render_models_view.py`; `check_models_view_site` pins it. |

### Traced framings — hand-authored prose, concept-model traceability

| Framing (card) | Model backing (concepts.json) | Book home (link-through) | Status |
|---|---|---|---|
| The Modeling Principle (`card-modeling-principle`) | `modeling-principle` | 1.2 | Traced. Prose hand-authored; concept record + L1–L4 lints resolve. |
| The Alignment Principle (`card-alignment-principle`) | `alignment-principle` | 2.3 | Traced. Same. |
| Models are the universal language (`card-universal-language`) | `universal-language` (master principle) | 6.0 | Traced. Same. |
| Constraint (`card-constraint`) | `constraint` | 2.3 | Traced. |
| Sensor (`card-sensor`) | `sensor` | 2.3 | Traced. |
| The residual (`card-residual`) | `residual` | 2.3 | Traced. |
| Generate to falsify (`card-generate-to-falsify`) | `generative-validation` | 4.6 | Traced. site_home breaks the `card-<slug>` convention on purpose; L2/L3 join on the declared id. |

### Elaboration framings — sub-facets of a backed concept, each with a book home

These cards elaborate a concept that IS modeled; the parent concept is the backing, and each card links
through to a book chapter, so **book coverage ⊇ site holds via the link-through**. They are not separate
concepts and do not each owe a concept record.

| Framing (card) | Elaborates | Book home |
|---|---|---|
| Agent-legible & precise (`card-agent-legible-precise`) | Modeling Principle | 1.2 |
| It can't lie (`card-it-cant-lie`) | Modeling Principle | 2.2 |
| Cheap to keep, pays back (`card-model-pays-back`) | Modeling Principle | 1.2 |
| Modelling democratizes (`card-modelling-democratizes`) | universal-language | 6.0 |
| The judgment moved up (`card-judgment-moved-up`) | universal-language | 6.0 |
| Firewall vs. smoke detector (`card-constraint-vs-sensor`) | constraint + sensor | 2.6 |
| Reading failure as a missing mechanism (`card-alignment-grows`) | Alignment Principle | 4.5 |

### School / spectrum framings — book-covered, not concept-record-modeled

The two schools, their midway, and the ordering axis. concepts.json is a curated *core-concepts* set, not
a total enumeration, so these carry no concept record — but each links through to a book chapter, and the
book outline covers them (preface "Three ways to run a fleet"; 1.1; 4.5 "Three ways to run an agent").

| Framing (card) | Book home | Outline coverage |
|---|---|---|
| Vibe coding (`card-school-vibe-coding`) | 1.1 | preface "Three ways to run a fleet" |
| Oversight-centric (`card-school-oversight-centric`) | 1.1 | same |
| Governance-centric (`card-school-governance-centric`) | 2.3 | same |
| The midway is a discipline (`card-midway-discipline`) | 2.3 | same |
| velocity • oversight axis (`card-velocity-oversight-axis`) | 1.1 | same |

### The three ways of thinking — book-covered, one maps to an outcome

| Framing (card) | Book home | Note |
|---|---|---|
| Architect deliberately (`card-way-architect-deliberately`) | 4.5 | Book-covered (4.5 "Three ways… and why I chose one"). |
| Convert failure into machinery (`card-way-convert-failure-into-machinery`) | 4.5 | Also maps to the self-governance skill outcome in outcomes.json. |
| Keep judgment scarce & central (`card-way-keep-judgment-scarce-central`) | 4.5 | Book-covered. |

### Site-only surface — adoption & navigation, model-exempt by design

The quick-start, nav cards, template downloads, skills cards, and the census. concepts.json lists these
as `_site_only_cards` — no conceptual claim, so no book counterpart owed: `card-quick-start`,
`card-references`, `card-download-the-catalogue`, `card-abstractions-glossary`, `card-starter-claude-md`,
`card-agent-brief-template`, `card-design-doc-template`, `card-epic-template`, `card-op-playbook-template`,
`card-governance-lint-example`, `card-ways-note`, `card-governed-environment-figure`,
`card-views-of-the-governance-catalogue`, `card-skill-self-communicate`, `card-skill-self-governance`,
`card-skill-self-operations`, `card-skills-loop`.

## Findings

### (a) Site framings with no model backing

**None structural.** Every conceptual card traces either to a concept record, to a book chapter via its
link-through, or to a book-outline section. One bookkeeping gap:

- **F1 — `card-both-halves` is a site-only packaging card missing from the `_site_only_cards`
  exemption list.** Its body ("What this site packages… both halves, as three Claude skills") makes no
  conceptual claim and carries no book link — it is adoption/navigation, like the skills cards next to it.
  It belongs in concepts.json's `_site_only_cards`. It is not currently *flagged* (the L1–L4 lints check
  concept-record site homes, not every card), so this is a latent classification gap, not a red gate.
  **Fix:** add `"card-both-halves"` to `_site_only_cards`. `[FIX]` · low.

### (b) Core model elements the site does NOT project

Several model elements are omitted — each by an explicit, defensible policy, not oversight:

- **Chapter- and section-level outcomes (44 of them) are book-only.** `outcomes-site.json`'s selection
  policy projects only `granularity ∈ {book, part}`; chapter/section outcomes are book-detail. Honest by
  policy, and the models reading view (`models-view.html`) now surfaces all of them for the reader who
  wants the full model. **No action.**
- **The three gap-recommended outcomes are not projected.** Policy excludes `provenance =
  gap-recommended` — those are the author's fill worklist, not a promise the site should make yet.
  **No action** (they surface, marked, in the reading view).
- **Book-only concept records are not projected**, by design: `mirror-vs-spec`, `drift-caveat`,
  `journey-task-closure`, `governance-target-{agent,models-bridge,product}`. Each is a caveat or an axis
  realized structurally (the caveat needs no card; the governance-targets are the catalogue's three role
  sections). concepts.json marks them `status: book-only`. **No action.**
- **The four definitions' book home is OWED, not landed.** definitions.json records
  `book_home_owed.status: owed` — the Part-2 Definitions section is drafted, not yet tagged with an
  `index-def` in a chapter. This is the projection thesis's "book coverage ⊇ site" as a *tracked debt*,
  not a silent gap; the definitions drift check requires only a resolvable *site* home until the book home
  lands. **Tracked** (drain-phase follow-up) `[FIX]` · owed.

### (c) Drift / mismatch

- **F2 — the principles and mechanism-classes are TRACED, not PROJECTED.** Their card prose is hand-authored
  on the landing; concepts.json only asserts the site card and book tag both resolve (traceability), it
  does not *supply* the prose. So a definition and an outcome are true projections (edit the model, the
  site re-flows), but a principle card is not (edit concepts.json, the landing prose does not change). This
  is a **deliberate depth difference**, not a defect: the principles are the site's rhetorical spine and read
  as authored argument, while definitions/outcomes are enumerable records that gain from being generated.
  Recorded here so the asymmetry is a decision, not a surprise. **Decision for the author:** leave as
  traceability, or promote the principle cards to a `principles.json` projection (a sibling of definitions.json)
  in a later walk. `[DESIGN]` · author's call.

## Decisions surfaced for the author

1. **F1 (`card-both-halves` → `_site_only_cards`)** — a one-line classification fix. Recommend taking it.
2. **F2 (principles: traceability vs. projection)** — a depth call. The current split (principles authored,
   definitions/outcomes generated) is coherent; promoting the principles to a projection is a future walk, not
   a correction. No action needed unless the author wants the principles generated too.
3. **Definitions' owed book home** — already tracked in definitions.json; the drain phase lands the
   Part-2 Definitions section and flips `owed → landed`.

Everything else is aligned: the site projects the definitions and the core outcomes from their models,
traces every concept card to a model record or a book chapter, and confines hand-authored material to the
adoption-and-navigation surface the rule permits.
