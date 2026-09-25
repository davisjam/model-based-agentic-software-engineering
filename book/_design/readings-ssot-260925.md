# Readings SSOT — bring the Handbook onto the one citation backend (260925)

**Status:** DESIGN, then implemented in the same series of commits (Phases 2–6 below).

**Problem.** The Handbook's per-chapter `::: read_further` blocks and the course landers'
`readings:` front matter both curate reading lists for the same material, and they have drifted —
different works, different counts, different facts for the same work. The cause is not editorial
neglect; it is that only one of the two surfaces is joined to a backend. The course side already
projects bibliographic fact from `book/references.bib` through `site/hooks/readings.py` and holds
that join with a BLOCKING gate (BIB-12). The Handbook participates in none of it: it hand-types
every reference into prose, against a *second* 25-entry bibliography of its own.

**Therefore this is not a new mechanism.** The doctrine already exists, stated verbatim in
`tests/course.py` and `catalog_tests.py`:

> bibliographic fact is projected from the one citation backend (`site/hooks/readings.py`), never
> hand-maintained per lander.

The work is to extend that doctrine to the Handbook.

---

## §1. Target architecture

`book/references.bib` is the sole bibliographic SSOT for the repo — book, course landers, and now
the Handbook. Its rendered Chicago strings live in `book/data/citations.json`, produced once by
`book/render_citations.py` through the single Typst/Hayagriva engine, and consumed by every surface.

**`handbook/bibliography/references.bib` is DELETED, not generated.** `handbook/book.yaml`'s
`bibliography.file` points at `../book/references.bib`.

*Why deleted rather than a generated projection.* A projection would be a byte-copy in the same
format: the Handbook needs no filtered subset, because Pandoc ignores entries nothing cites and the
build already passes `-M suppress-bibliography=true`, so no reference list is emitted from the bib
at all. A generated twin would therefore buy nothing and cost a regen step, a provenance header, and
a staleness gate. It is also structurally unavailable: BIB-9 (BLOCKING) refuses two `references.bib`
entries sharing a (title, year), so the five works registered under two key spellings
(§2) must collapse onto one key regardless — after which a separate handbook bib holds nothing the
book bib does not.

The `chicago-author-date.csl` stays under `handbook/bibliography/` — it is a *style*, not
bibliographic data, and the Handbook's inline author-date register is deliberately different from
the book's note register.

## §2. How the Handbook renders a cite

A READ FURTHER entry needs the **full** bibliographic string, not the author-date short form citeproc
produces inline. So inside a `read_further` block the citation is *projected*, exactly as a lander
item is, rather than resolved by citeproc.

**New filter `handbook/filters/citations.lua`**, running immediately after `crossrefs.lua` and
**before** `--citeproc`. Inside a `read_further` Div it replaces each `[@key]` /
`[@key, <locator>]` Cite with the projected Chicago **bibliography** string for that key. Outside
such a block, Cites are untouched and citeproc resolves them author-date as today.

The strings arrive as Pandoc metadata: `build.py` adds a `handbook_citations` map to the
`generated/chapter-map.yaml` it already writes and already injects into **every** Pandoc invocation
via `--metadata-file`. So no argument plumbing is added at the four call sites, and the mechanism
reuses the repo's existing "inject a directory the filter reads" idiom (`handbook_chapters`,
`handbook_sections`).

Three decisions inside that, each with its reason:

- **`bib_html`, not `note_html`.** The READ FURTHER box is a hanging-indent bibliography, and
  `bib_html` is the same string the book's own Works Cited prints. Landers use `note_html` because a
  lander item is a running-prose sentence. Same backend, different projection — chosen per surface,
  authored nowhere.
- **A filter, not a text pre-pass.** `build.py` hands Pandoc chapter *file paths* in four places
  (front matter → Typst, chapters → Typst, the combined ePub source, chapters → gfm). Expanding a
  `[cite: key]` marker in text would require shadowing the manuscript into temp files at each. The
  filter is one place, and all three renderers inherit it because the substitution happens before
  `handbook-components.lua` branches on format. **Typst, ePub, and web need no change at all.**
- **Before citeproc, not after.** Pandoc's Lua `Citation` type carries no `locator` field; a locator
  rides `citation.suffix`, which citeproc consumes. Reading it requires running first. `crossrefs.lua`
  already runs pre-citeproc for the same reason.

Locator grammar: `[@winters2020, chaps. 9 and 11–14]`. The suffix, minus its leading comma, is the
locator — the same free-text convention as the lander's `locator:` field and the book's
`[cite: key, locator]` marker.

## §3. Multi-source entries — the paragraph *is* the group

A Handbook READ FURTHER entry is richer than a lander item. Chapter 8's property-based entry bundles
three sources — Cockx, Claessen & Hughes, Anthropic — in one flowing paragraph whose connective
commentary ("for the technique's origin, see…; for a contemporary application in an agentic
setting, see…") is the pedagogy. A one-cite-per-item model destroys that.

**Decision: a READ FURTHER entry stays a prose paragraph. The model is *prose with embedded cites*,
not a list of citation records, and no grouped-entry container type is introduced.** The paragraph is
the group; a cite is a projection point inside it. This is precisely why the Handbook takes the
inline-cite form while the lander takes the structured-item form: the Handbook's unit of curation is
a paragraph, the lander's is a list item. Both project their bibliographic fact from the one backend;
neither is forced into the other's shape.

Consequence worth stating: a grouped entry needs no new lint concept either. "Every bibliographic
fact in this paragraph is projected" is the same predicate whether the paragraph holds one cite or
three.

One authoring rule falls out of implementation and is recorded in the filter's header: **a projected
entry carries its own closing period, so connective prose must leave a cite at a sentence boundary.**
"For the technique's origin: [@claessen2000quickcheck] For a contemporary application in an agentic
setting: [@anthropic2026propertytesting]" reads correctly; the mid-clause "see X; for a contemporary
application, see Y" yields "…268–79.; for a contemporary…". Chapter 8's entry was rewritten to the
first shape, which changed its punctuation and not one word of its argument.

## §4. What stays hand-authored — the annotation, per surface

The annotation is pedagogy, not bibliographic fact, and it legitimately differs by surface: a
Handbook reader gets "why this work matters to the chapter's argument"; a student gets an
assignment ("Read §1 and the opening of §5; skim §3.2").

**Decision: per-surface annotation. No shared annotation field, and no override mechanism.**

Grounded, not assumed: across the eight matched chapter/lander pairs, **zero** entries share
annotation text — not one. A "shared annotation with per-surface override" design would carry a
mechanism overridden 100% of the time, which is a mechanism that exists only to be bypassed. What
*is* shared is the bibliographic record and the locator, and both are now projected.

## §5. The gate

A sibling of BIB-12, `check_handbook_reading_citations()` (**BIB-13 / HB-CITE**), in
`tests/citations.py` beside the other bibliography-subsystem gates. Its predicate, mirroring
BIB-12's two halves:

1. **Keys resolve.** Every `@key` cite in `handbook/chapters/*.md` and `handbook/frontmatter/*.md`
   names an entry in `book/references.bib`.
2. **No hand-authored bibliographic fact in a READ FURTHER block.** Operationally: no markdown link
   inside a `read_further` block (every bibliographic URL must arrive through the projection), and
   every `read_further` block carries at least one cite. This is the Handbook's analogue of BIB-12's
   ban on a hand-written `Full citation:` sentence, and it is deterministic — a link either is or is
   not in the block.
3. **Non-empty-corpus guard**, the shape every gate here carries: if no `read_further` block is
   found at all, FAIL rather than silently pass over an empty set.

`check_cite_orphans` (BIB-ORPHAN, audit-only) is extended to count a Handbook cite as a use of a
`.bib` entry, on the same reasoning that already makes a lander reference count: the bib is the
repo's ONE citation backend, so works cited only by the Handbook live there too.

Landing posture: the gate lands after the migration drains the findings to 0, so it lands BLOCKING
(rule: AUDIT-ONLY first only if it finds >0 at HEAD). Measured count is reported in the commit.

Second, weaker enforcement comes free: `handbook/scripts/lint.py` already collects every `Cite` key
from the raw chapter AST and errors on a key absent from the bibliography — so repointing
`book.yaml` at the one bib makes the Handbook's own build fail loud on a rotted key, without a line
of new lint code.

## §6. Second-order effects

- *A key renamed in `book/references.bib`* now breaks three surfaces at once instead of one. That is
  the intended trade: it is caught by BIB-13 + BIB-12 + CITE-RESOLVE at test time rather than
  discovered as drift months later. The failure is loud and local.
- *`citations.json` staleness.* Handbook rendering now depends on it. CITE-FRESH (BIB-6) already
  fails the build on a stale stamp, so the Handbook inherits the existing guard rather than needing
  a new one; `build.py` fails loud on a key missing from the map rather than emitting a blank.
- *Bib growth.* The merged bib is ~305 entries and is parsed by Pandoc once per chapter per format.
  Measured: no meaningful change to build wall-clock (the parse is milliseconds against a
  multi-second Typst compile).
- *Editorial coupling.* Syncing the two surfaces' *content* (§Phase 6) is an editorial act and stays
  the author's. This design deliberately fixes only the mechanism; it hands the author a per-pair
  reconciliation rather than performing it.

## §7. Phases

| Phase | Work |
|---|---|
| 1 | This document. |
| 2 | Merge the bibliographies; report every shared key whose content diverged. |
| 3 | Migrate the Handbook's 11 `read_further` blocks to cite form; add the filter + build wiring. |
| 4 | Finish the lander migration — raw bibliographic strings → `- cite:` items. |
| 5 | Land BIB-13. |
| 6 | Per-pair content reconciliation: apply the unambiguous, report the editorial. |

---

## §8. Phase-6 reconciliation — what each surface has that the other lacks

With one backend, this is now a computed diff rather than a reading exercise: compare the cite keys
in a chapter's READ FURTHER box against the keys in its lander's `readings:` front matter. The table
below is that diff, taken after Phases 3 and 4 (which closed several gaps on their own — Chapter 8's
property-based sources, for instance, went from three-on-one-side to matched, because the lander's
hand-written `note:` became two cite-backed items).

**Applied (one).** `warm2008vigilance` → Handbook Chapter 8's READ FURTHER. The test for "unambiguous"
here is deliberately narrow, because a READ FURTHER box is a curated short list and lengthening it is
an editorial act: *the chapter's own prose already cites the work, and the matched lander already
assigns it.* Chapter 8 §"evidence and attention" cites Warm et al. on vigilance in the body; lander
08-validation assigns it under "Human attention is a finite validation mechanism." Exactly one pair
met that test.

**For the author (everything else).** No divergence below was applied, and nothing was dropped from
either surface.

| Pair | Handbook has, lander lacks | Lander has, Handbook lacks | Recommendation |
|---|---|---|---|
| 00 Software Engineering ↔ 01 Engineering and GenAI | — | — | Match. |
| 01 Process ↔ 02 Software Process | Sommerville; Boehm & Turner; Winters et al. | Royce; Brooks chap. 11; Beck (XP); Agile Manifesto; Scrum Guide | **Zero overlap, and it reads deliberate, not drifted.** The Handbook offers three modern surveys of how process is argued about; the lander assigns the primary sources process arguments are *made of*. Author's call whether that split is intended. If it is, say so in the chapter; if not, the obvious bridge is the Agile Manifesto into the Handbook and Sommerville into the lander. |
| 02 Teamwork ↔ 03 Teamwork | Li, Ko & Zhu; MAGE Part 7 | Winters chap. 2; Winters chap. 7; DORA | The MAGE gap is only apparent — the lander reaches Part 7 through `{mage:7.1}`/`{mage:7.3}` tokens. **Li, Ko & Zhu is the real one**, and it is the strongest single candidate in this table: it is the Handbook chapter's own empirical anchor for what engineers value in each other. Recommend adding it to the lander. |
| 03 Engineering Knowledge ↔ Act 3 / 01 | — | — | Match, all four. |
| 04 Requirements ↔ 04 Requirements | Nuseibeh & Easterbrook | Sommerville chap. 4 | **Substitutes, not additions.** Each surface carries one organized survey of requirements engineering; they are different surveys. Cross-adding gives each two. Recommend leaving split, or picking one survey for both. |
| 05 Specification ↔ 05 Specification | — | MAGE Part II intro + §2.1 | The lander pairs specification with the modeling chapter; the Handbook chapter does not reach for MAGE. Whether the Handbook should is a question about the two books' relationship, not a drift. |
| 06 Architecture ↔ 06 Architecture | Bass, Clements & Kazman | Abowd et al.; Kazman ATAM; Wan et al.; MAGE §4.2 | The lander is a *teaching* list (analysis methods, practice study, a worked case); the Handbook is a *reading* list (one standard text, one risk framing, one views framing). Both look intentional. Bass is the one candidate that fits the lander's "Architecture and risk" group without changing its character. |
| 07 Design ↔ 07 Design | — | — | Match, all four. |
| 08 Validation ↔ 08 Validation | — (after the applied addition) | Miller et al. on fuzz testing | The Handbook chapter names fuzzing but does not cite Miller, so adding it is a new commitment, not a projection of one — that is why it was not applied. Recommend adding if the chapter's fuzzing treatment is meant to stand on evidence. |
| 10 Failure-Aware ↔ Act 2 / 04 | — | — | Match, all six (three of them the lander's `optional:`). |
| 09 Research and Development | *no lander* | — | The Handbook chapter has no matched course unit. Structural, not drift. |

**Unpaired in the other direction**, for completeness: four landers have no Handbook chapter —
09 Engineering Decision-Making and Metrics, and Act 2's 01 Agent Levers, 02 Modeling, 03 Alignment.
Those units teach from MAGE rather than the Handbook.

**Two readings still carry no bibliographic record**, and both need an author decision rather than a
migration. "Extreme Programming Considered Harmful" (lander 02) names no author and no year on either
surface. "Works by Nancy Leveson, TODO." (lander 03-alignment) is an explicit placeholder whose own
note says the work and portion are still being chosen.
