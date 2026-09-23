# Provenance — Chapter 2 model-census / invariant-corpus research round

Ingested for traceability: the source evidence behind Chapter 2's claims about
DocAble's model family — the model census, the invariant corpus, the
dependency and lifecycle graph exports, and the two research rounds (R1
inventory + synthesis; R2 structural exports + joins/RCA/evolution).

**Stored verbatim.** No file was edited and no header was added to any
artifact, so each sha256 below verifies the ingested copy against the original
capture. All provenance lives in this file.

`THREAD.md`, `query.md` and `next-request.md` are the *prompts* that produced
the rest — keep them: they are what makes a later re-run comparable.

## The artifacts

| file | bytes | captured (local) | sha256 |
|---|---:|---|---|
| `R1-response-A-inventory-260922.md` | 52,241 | 2026-09-22 00:50 | `22851b28cc3b0eeb6678688799bcc2d9a87e2c88ccd11674f317011656f74fe8` |
| `R1-response-B-synthesis-260922.md` | 34,028 | 2026-09-22 00:57 | `ac2b4fd8f1fd95cbeef4e19eeb8e2eaa02cfe41f330d4c491edd33caa8dec555` |
| `R2-graph-full-260922.dot` | 49,283 | 2026-09-22 11:22 | `ebb64ccc05a5892184120264b56ada6c95ddaa8a974f3e4539b7166e26464115` |
| `R2-graph-subgraph-260922.dot` | 9,453 | 2026-09-22 11:22 | `7821ec35b7f4a826fdf87885ce6a911b1206202d5dd06a596055f4f7d809d8c7` |
| `R2-invariant-corpus-260922.csv` | 68,425 | 2026-09-22 11:22 | `7c452776ad12fe76c3305eb445b44e075a4b7bc70c3e64db1ebbdb1de1082efa` |
| `R2-lifecycle-260922.dot` | 2,524 | 2026-09-22 11:25 | `b4794ade98ee882dbdb4ef4a557e7cf5001cb98dfe5fe151da1de26ce66b62bc` |
| `R2-lifecycle-260922.mmd` | 1,376 | 2026-09-22 11:25 | `8c6a3ae3f26470418c38bfc6c57771e24dc96476fee8f62f55e8b2aad4cb71df` |
| `R2-lifecycle-parent-260922.dot` | 1,811 | 2026-09-22 11:25 | `26bb947d9e5991ed2ed499d6515791094ba4082e1c0973b34d733aac0611fe84` |
| `R2-lifecycle-parent-260922.mmd` | 855 | 2026-09-22 11:25 | `a8855a3b97cd9a0b4cf4e2aff32d7edd4b22934259910f00032d4ab24e65083c` |
| `R2-model-census-260922.csv` | 30,973 | 2026-09-22 11:35 | `3e077dff9a622e3e8256b90e00a768d7f63bebee2a0fdc764da6b72fb02255f5` |
| `R2-response-A-structural-exports-260922.md` | 81,722 | 2026-09-22 11:35 | `2caaa7a635c0e211b18b363c965f508ab06cb81fe150e0e471c89026db9304cf` |
| `R2-response-B-joins-rca-evolution-260922.md` | 39,759 | 2026-09-22 11:32 | `18fee30974ad8a9f47c8eaab1f63006e493f0d9795496f6049c0a1bde42c6f99` |
| `THREAD.md` | 3,642 | 2026-09-22 11:33 | `bf311df0d704ac9810febdf273e43b25dc3a5b2eea88b72bf0944d281ae8687d` |
| `next-request.md` | 4,151 | 2026-09-22 11:13 | `7859607fc88115bdeedfc6173f8ae2f07d8dbccd1779ae13fcd2cd754d8c6265` |
| `query.md` | 9,020 | 2026-09-22 00:38 | `55b07e260ac6b1fc486ba2c664e0576c7241f1c4cc6a3e26a0141579319d7d1b` |
Total 389,263 bytes across 15 files. Captured 2026-09-22; ingested 2026-09-23.
Origin: `~/Downloads/chapter-2-models/`.

## Standing and sensitivity

This repository is **public**. `book/_design/` is tracked but excluded from the
built site (`catalog.py:722` skips it as working notes), so these files live in
git history and are readable in the repository, but are not rendered into the
published site.

This corpus exposes more of DocAble's governance substrate than the book
itself publishes — the full model census, the invariant corpus, and complete
dependency graphs. That is a deliberate publishing decision by the author, not
an incidental filing choice. It was flagged before ingest and approved.

## Known drift

The live count differs from the editorial round: a research draft cited **130**
models, while `repo-query.py models kinds` returned **129** (ENVIRONMENT 1 ·
PRODUCT 77 · AGENT_META 51) when re-derived. The census here is a snapshot of a
moving system. Re-derive rather than quote when a number is load-bearing — and
note that the drift is itself evidence for the book's claim that these are
maintained artifacts rather than one-time documentation.

## Re-runs

If this research is ever re-run, add the new capture in a sibling dated
directory rather than overwriting. The sha256 values are what let a claim in
the book be traced to the exact evidence that supported it at the time it was
written.
