# Provenance — DocAble memory-then-time performance-engineering reconstruction

Ingested for traceability: this is the source evidence behind the §4.2
revision (the memory/time ratchets, the `T=(R+1)F+G` execution model, the
structural-counter performance ratchet, and the falsified-premise record that
grounds the **Ratcheteering** technique).

## The artifact

| field | value |
|---|---|
| file | `00-reconstruction.md` |
| bytes | 30,439 |
| words | 3,772 |
| sha256 | `c6b05b278aa01b90d38be7c54d6c8c0f7bdbaea14748253b1ba40de7b446cbd9` |
| captured | 2026-09-23 00:21 local |
| ingested | 2026-09-23 |
| origin | `~/Downloads/multi-ratchet-092226/00-reconstruction.md` |
| produced by | a forensic reconstruction run against the DocAble (ADATool) repository |

**Stored verbatim.** No header was added to the artifact itself and no line was
edited, so the sha256 above verifies the ingested copy against the original
capture. All provenance lives in this sibling file.

## What it contains

| § | content |
|---|---|
| §0 | what verified, what did not — read first |
| §2 | the memory ratchet, artifact by artifact |
| §4 | the time ratchet — two models + a counter gate |
| §5 | recurring wasted-time causes |
| §6 | resource interaction — memory and time explicitly coupled |
| §7 | agent degrees of freedom |
| §8 | confidence from a model vs from repeated runs |
| §9 | dated chronology |
| §10 | the honest hedges (marked "do NOT sand these off") |
| §10b | verdict on the memory-first → envelope → time-within-envelope thesis |
| §11 | open cites — resolved |

## Why this was ingested when the Chapter 2 corpus was not

This repository is **public**. The `~/Downloads/chapter-2-models/` corpus (the
130-model census, the invariant corpus, the dependency-graph exports) was
flagged and held pending an author ruling, because it exposes substantially
more of DocAble's governance substrate than the book itself publishes.

This artifact is different in kind. It is the evidence record for material the
book **already publishes in §4.2** — the residency bound, the peak-RSS
invariant, the critical-path timings, the concurrency model. Ingesting it makes
the published quantitative claims checkable rather than asserted, which is the
`appendix-evidence-ledger` discipline applied one level earlier.

It still becomes public on push. §10's hedges and §0's verified/not-verified
split are load-bearing for reading it honestly — they are the reason this is a
defensible thing to publish, and they must not be stripped.

## ⚠️ Terminology note — "skeletonization" names two different things

**The record and the book use this word for different scopes. Do not read one
as the other.** (Recorded here rather than in the artifact so its sha256 keeps
verifying against the original capture.)

| where | what it names | status |
|---|---|---|
| **This record**, §2 item 3 | the narrow strategy *"strip embedded media pre-produce"* | **REFUTED + PARKED** — *"would render blank figures; does not bound the dominant render-fed capture term"* |
| **The book**, §4.2 | the architecture where the pipeline streams through the package, moves media to external storage, and leaves stable references in a small structural skeleton | **durable** — this is the media-by-reference lever of §2 item 3's sibling, `chunkless-produce-memory-bounding-260831` (content-addressed `media://<sha256>` + sidecar spill; pptx-250 peak RSS 2747.3 → ~1400 MiB) |

**The book's usage is the correct and intended language** (author ruling,
260923). The chapter is describing the durable architecture, not the parked
strategy. The bound it teaches is held by `bounded-streaming-buffers-260830`
(a seam, a BLOCKING lint, and property test INV-BSB-4 — constructed and
declared rather than measured) together with that media-by-reference lever.

The hazard this note exists to prevent: a later reader or agent matching the
book's term against this record's narrower one, concluding the chapter
describes abandoned architecture, and "correcting" prose that is already right.

## Standing

`book/_design/` is tracked but excluded from the built site
(`catalog.py:722` skips it as working notes). So this artifact lives in git
history and is readable in the repository, but is not rendered into the
published site.

Claims drawn from it into §4.2 should cite it by this path. If the
reconstruction is ever re-run, add the new capture alongside rather than
overwriting — the sha256 is what makes a later claim traceable to the exact
evidence that supported it.
