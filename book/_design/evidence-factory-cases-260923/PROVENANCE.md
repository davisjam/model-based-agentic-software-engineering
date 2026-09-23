# PROVENANCE — factory-case evidence crawl, 2026-09-23

## What this is

Seven read-only research crawls, one per organization in §5.3's corpus (Uber, Cloudflare,
Spotify, Shopify, Siemens, Zenseact, GitLab), gathered on **2026-09-23** from the current
public record. Each `<org>/README.md` follows the same schema:

- **§ Sources** — a weighted source table (`[S]` ids): publisher, author, date, URL, access
  date, type (`eng-blog` / `talk` / `paper` / `press` / `docs` / `third-party`), and an
  evidentiary-weight judgment. Failed and blocked fetches are recorded, not silently
  substituted.
- **§ Evidence** — dated verbatim quotations (`[E]` ids). Ellipses mark elision; nothing else
  is altered. Recorded **absences** (a targeted read that found no such sentence) are
  first-class `[E]` items.
- **§ Claims** — analytical statements the book could make (`[C]` ids), each organized
  against §5.1's factory anatomy (where work originates · what humans do · what agents do ·
  what the fabricator inherits · what it may decide · where quality is established · who
  holds admission · how experience changes the factory) and each carrying the `[E]` ids that
  license it.
- **[GAPS]** — what the public record does not answer. These are content, not leftovers:
  §5.3's rewrite treats an honest "the record does not say" as part of each case.

## Method

Primary retrieval was **raw fetch**: pages pulled directly (curl / REST API) and converted
to text locally, so quotations are transcribed from the article body. Where a file instead
relied on a **summarizing fetch tool**, it says so — GitLab's README marks every such source
"Method X" and instructs re-verification before any of its strings is printed as a
quotation; Cloudflare's README records its summarizer anomalies explicitly. Paywalled or
member-only material (the Farnam Street podcast transcript, Pragmatic Engineer beyond §3)
was **not** substituted from secondary summaries without marking: such items are tagged
`[third-party paraphrase]` and the book must not present them as established.

### Two wrong readings produced by summarizing fetches — a methodological finding

1. **Cloudflare, 2026-08-07 corroboration pass.** An earlier WebFetch-based check
   (`book/_design/drafts/cloudflare-v2-corroboration-260807.md`, fix #1) concluded the
   source said only "nearly a quarter of a million" and directed "do not ship 230,000."
   The raw body read on 2026-09-23 shows the post contains **both** figures — "nearly a
   quarter of a million" in the lede and "close to 230,000" in the body — so the instruction
   was wrong. A dated correction now sits in that draft file.
2. **Cloudflare, 2026-09-23 first pass.** A summarizing fetch of the same post reported it
   silent on any feedback loop. That is true of the one post and **false of the Cloudflare
   record as a whole** (the Code Orange completion report, the Astro post, and the CIO
   account all carry conversion-loop material). The summarizer output was discarded and the
   raw text used.

Lesson applied throughout: prefer raw sources; a summarizer's silence is not the source's
silence. (Related: pdftotext cannot read SVG text — figures in the Zenseact whitepaper were
read directly from the downloaded PNG assets instead.)

## Per-organization files

| Org | File | Lines | Sources | Evidence items | Claims |
|---|---|---|---|---|---|
| Uber | `uber/README.md` | 357 | 12 | 47 | 34 |
| Cloudflare | `cloudflare/README.md` | 781 | 13 | 65 | 34 |
| Spotify | `spotify/README.md` | 821 | 16 | 81 | 37 |
| Shopify | `shopify/README.md` | 287 | 14 | 53 | 34 |
| Siemens | `siemens/README.md` | 224 | 14 | 49 | 31 |
| Zenseact | `zenseact/README.md` | 542 | 12 | 41 | 17 |
| GitLab | `gitlab/README.md` | 738 | 25 | 59 | 39 |

(Counts are unique ids per file, counted mechanically; sub-lettered items such as `E27a`
count separately. Total: ~3,750 lines, ~395 evidence items, 226 claims. Line and claim
counts were re-counted after the second pass's §E addenda landed on 2026-09-23; the pass
added `[C]` and `[GAPS]` entries only, so the evidence and source columns are unchanged.)

## Second analytical pass — 2026-09-23

The seven files above are the crawl. On the same day a **second pass** read them as a
corpus rather than one at a time, and its output is
`book/_design/drafts/case-analysis-pass2-260923/` (four cluster files plus a ruling
SYNTHESIS). It ran as four question-clusters — authority and admission; obligations and
evidence; specification and failure; correspondence and economics — over the seven cases
**plus DocAble (§5.2) as an eighth comparator**, so a distinction could be tested against a
factory whose internals the book documents from the inside.

**The discipline rule.** A distinction was recorded only if either (a) two cases differed on
it and both sides carried `[E]` ids, or (b) one source called the difference consequential in
its own voice. A distinction that could be drawn but that no case varied, and that no source
named, was dropped. The clusters' "considered and dropped" sections record what that rule
killed.

**Silence stayed separate from absence.** Throughout the pass, "**not publicly stated**"
(the crawl looked and the record is silent) and "**unclear**" (sources exist but conflict or
underdetermine) are distinct findings and are never collapsed into one phrasing. Several of
the addenda below exist only to mark which of the two an existing gap actually is.

**What the pass changed in the book.** Its §B found four passages in §5.1–§5.4 asserting
something the evidence contradicts; all four landed in §5.3 on 2026-09-23. Briefly: the
shared-baseline paragraph grounded all human retention at admission in evidence adequacy,
which is Uber's framing alone (Shopify's is responsibility-grounded, Siemens' compliance-
grounded); the chapter said conversion's effect "is measured nowhere" five paragraphs after
saying Shopify measured it "with the counterfactual controlled"; GitLab's withheld-Approve
construction was generalized past the one flow that documents it; and Uber's PR evidence
table was presented without noting the producing agent assembles it. A reader wondering why
those sentences read as they now do should start at §B of the SYNTHESIS.

Its §E supplied the per-org addenda applied to the seven files in the same pass — new
`[GAPS]` entries, amendments where an existing claim over- or understated its evidence, and
new `[C]` claims. Ids were **appended, never renumbered**, so every citation written before
2026-09-23 still resolves. §A's remaining distinctions are routed but deliberately **not**
folded into the chapter; they await the author's ruling.

## Standing instruction

**Every factual claim in `book/part5/5.3-other-agentic-software-factories.md` should trace
to an `[E]` item in these files.** When updating §5.3 against newer public material, update
or extend the relevant evidence file first, then the prose; where an evidence file and the
book disagree, the dated evidence wins. Do not cite a claim these files cannot carry — add
a properly sourced bibliography entry or leave the claim out. Figures carry their dates and
their definitional caveats (e.g. Uber's >70% "attributed" has no published denominator;
Shopify's "half of PRs" is an origination share, not a merged-coauthored share).
