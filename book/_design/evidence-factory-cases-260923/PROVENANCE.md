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
| Uber | `uber/README.md` | 341 | 12 | 47 | 30 |
| Cloudflare | `cloudflare/README.md` | 744 | 13 | 65 | 32 |
| Spotify | `spotify/README.md` | 742 | 16 | 81 | 32 |
| Shopify | `shopify/README.md` | 278 | 14 | 53 | 32 |
| Siemens | `siemens/README.md` | 220 | 14 | 49 | 31 |
| Zenseact | `zenseact/README.md` | 520 | 12 | 41 | 16 |
| GitLab | `gitlab/README.md` | 686 | 25 | 59 | 36 |

(Counts are unique ids per file, counted mechanically on 2026-09-23; sub-lettered items
such as `E27a` count separately. Total: ~3,500 lines, ~395 evidence items, 209 claims.)

## Standing instruction

**Every factual claim in `book/part5/5.3-other-agentic-software-factories.md` should trace
to an `[E]` item in these files.** When updating §5.3 against newer public material, update
or extend the relevant evidence file first, then the prose; where an evidence file and the
book disagree, the dated evidence wins. Do not cite a claim these files cannot carry — add
a properly sourced bibliography entry or leave the claim out. Figures carry their dates and
their definitional caveats (e.g. Uber's >70% "attributed" has no published denominator;
Shopify's "half of PRs" is an origination share, not a merged-coauthored share).
