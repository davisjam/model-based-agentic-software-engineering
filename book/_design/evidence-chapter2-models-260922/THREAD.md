# Chapter 2 (Models) — DocAble evidence-extraction thread

Traceability ledger for the back-and-forth between the **reviewer** (Chapter-2 co-author,
proposing the query set) and the **repo owner** (DocAble; answers are produced by a
top-model — Fable — evidence-extraction pass over the actual repository, orchestrated by
Claude Opus). Every artifact in this directory is a numbered turn below. Newest last.

## Naming convention

- `RN-query*.md` — an inbound turn from the reviewer (round N). The opening turn is the
  existing `query.md` (= R1-query).
- `RN-response-<letter>-<topic>-<YYMMDD>.md` — an outbound turn from the repo owner
  (round N). One letter per Fable run in that round (A, B, …).
- Each response file carries a **provenance header** (Round / From / To / Responds-to /
  Model / Date / Repo-commit) so a fragment lifted into the chapter is traceable to its
  exact source turn and repo state.
- Repo-grounded claims inside a response cite `path:line` against the DocAble repo at the
  stated commit, so the reviewer can verify or quote directly.

## Turn ledger

| # | Turn | File | From → To | Date (YYMMDD) | Summary |
|---|------|------|-----------|---------------|---------|
| 1 | R1-query | `query.md` | reviewer → repo owner | 260922 | Proposed prompt set: 10 inventory/model-emission queries (#1–#10) + 3 synthesis queries (purposeful reduction / model-joins / model-vs-implementation). "Evidence extractor, not MAGE-explainer." |
| 2 | R1-response-A | `R1-response-A-inventory-260922.md` | repo owner → reviewer | 260922 | Fable run A: answers queries #1–#10 — inventory of 8–12 strong models + authoritative source representations (chunk lifecycle SM, zone/topology, dataflow, ownership/authority, decision/constraint, cross-service invariants + tier→checker derivation, budget, provenance, registry). |
| 3 | R1-response-B | `R1-response-B-synthesis-260922.md` | repo owner → reviewer | 260922 | Fable run B: the 3 synthesis queries — purposeful reduction on 4 maximally-different models; 2 model-joins; 1 model-vs-implementation side-by-side. Builds on R1-response-A. |
| 4 | R2-query | `next-request.md` | reviewer → repo owner | 260922 | R2 request: 6 publication-ready evidence items (graph export, invariant corpus, lifecycle export, join traces, before/after entitlement artifact, model census) + evolution-evidence addendum. |
| 5 | R2-response-B | `R2-response-B-joins-rca-evolution-260922.md` | repo owner → reviewer | 260922 | Fable run B (items #4, #5, evolution addendum): two end-to-end join traces (INV-1 facts→tier→checker→blocking gate; SyncEdge→URL wiring→runtime SA→derived IAM grants→applied gcloud) + extras (INV-18 liveness/.tla text-parity trace; X9 Backstage third projection); the verbatim before/after entitlement artifact (deleted `get_credit_balances` fragment, exact triggering state, live old-vs-new decision demo, same-day RCA→model→deletion timeline); evolution table for 9 models/controls + monthly accumulation curve (22/34/51/104/88 file-births 2026-05..09) + fleet-wide invariant census (40 modules / 272 invariants; composed model 86 reconciled with R1). Repo-commit `621c05852a` (R1 baseline `3baabd775d` is an ancestor; delta = interservice-edges/X9 only). |

## How to continue the thread

Reviewer: drop `R2-query-<YYMMDD>.md` (or `R2-query-<topic>.md`) into this directory and add
a ledger row. The repo owner answers with `R2-response-*-<YYMMDD>.md` and adds its rows.
Keep `query.md` as the immutable R1 opener; do not overwrite prior turns — each round is
append-only so the chapter's sourcing stays auditable.
