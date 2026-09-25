# Provenance — C: Governance conversion (flagged particularly important)

## Datasets
- `data/governance_conversions.csv` — **row-level curated dataset** of the
  governance-conversion episodes described in MAGE §5.2 "How the Factory
  Learned" (12 conversions GC01–GC12 + 3 ex-ante confirmations CF01–CF03).
  Columns: `id | approx_date | iso_week | triggering_incident | repair |
  control_type | affected_subsystem | failure_class | determinism |
  enforcement | recurrence_classification | evidence_provenance | notes`.
- `data/governance_conversion_series.csv` — weekly + cumulative conversion /
  confirmation counts derived from the curated CSV.
- `data/control_growth_weekly.csv` — reproducible weekly control accumulation.
- `data/governance_tag_counts.csv` — re-derivation of the book's 208 / 27 / 993
  against a documented definition.

## Figures
- **F7** controls accumulate (weekly lint files + gate scripts + model files).
- **F9** conversion over time (cumulative + weekly-new).
- **F10** what experience became (episodes by control category; **bars coloured
  by enforcement class** — deterministic/blocking vs probabilistic/advisory vs
  measurement-no-gate. The colour encoding was promised in the figure docstring
  but unimplemented — every bar rendered one colour; R3 wired it in).
- **F11** recurrence after conversion (conservative classification).
- **F12 (time-from-incident-to-control latency): UNAVAILABLE** — the curated
  episodes carry a single approximate date each, not separate incident-date and
  control-landing-date. There is no reliable per-episode latency to plot; the
  reflection-hook telemetry that would record the fire→control edge captured
  only `{event, ts, session, facet}`, never the resulting control. Reported as
  unavailable rather than fabricated.

## Classification of the measure
- **The row-level episode dataset is RECONSTRUCTED** from the book's own
  narrative (which is itself the author's retrospective reconstruction from
  field notes + git). It is authoritative for *which conversions the book
  claims* and their qualitative shape, NOT a mechanical census of every control
  the repo ever grew.
- **`control_growth_weekly` lint-file count is EXACT + VALIDATED**: the
  definition (`tools/lint/lint-*.py` tree entries) reproduces the book's window
  count exactly — 595 lint files at the hardening-window SHA `b1a4c1d4` matches
  the book's 595. HEAD (2026-09-24) = 990, consistent growth from the book's 747
  at the 2026-08-03 snapshot.
- **`gate_scripts_ourdef` is RECONSTRUCTED with OUR definition** (`(tools|deploy)/…(gate|check-)….py`)
  and does **not** reproduce the book's 0→20→76→102. The book's exact
  gate-script predicate is unrecovered (the `w4b-measurements` scratchpad that
  held it is gone). Our count (142 at HEAD) is reported as an independent
  reproducible series, NOT a claim to match the book.

## The 208 / 27 / 993 numbers — honest re-derivation, now decomposed
The book's authored source (`.../governance-catalog/book/data/data-claims.json`,
record `control-growth`) states these came from "a commit-message and
lint-docstring grep (w4b-measurements scratchpad)" at the 2026-08-03 snapshot.
**That scratchpad's exact grep is not recoverable.** `governance_tag_counts.csv`
therefore reports an INDEPENDENT re-derivation with a stated definition and the
book value beside it. **R3 update:** each metric is now also counted AT the book's
2026-08-03 snapshot SHA (`ce0bde110fbb`), not only at HEAD — which separates
GROWTH-since-the-snapshot from DEFINITIONAL divergence. The verdict: **the gaps
are overwhelmingly definitional, not growth.**

| metric | ours @ HEAD (09-24) | ours @ 08-03 SHA | book (08-03) | what the at-snapshot count shows |
|---|---|---|---|---|
| paired fix-and-lint commits | 349 | **333** | 208 | Growth since the snapshot is only 16 commits (349→333). The 333-vs-208 gap is DEFINITIONAL — our predicate (commit msg has BOTH `[FIX]` and `[LINT]`) is not the book's unrecovered grep. |
| incident-citing lints | 286 | **204** | 27 | Even at the snapshot we count 204, ~7× the book's 27. Our predicate (a `26xxxx` date token AND an incident/RCA/regression word anywhere in the lint body) is far BROADER than the book's "names the dated incident that motivated it". A loose UPPER proxy — **do not read it as the book's 27**. |
| registered lint specs | 1836 | **1230** | 993 | Part is growth (1230→1836) and part is over-count: a spec often carries BOTH `blocking=` and `audit_only=` kwargs, so the kwarg sum exceeds the spec count. The book's 993 used the registration loader at HEAD. Approximate. |

**Posture:** these re-derivations are provided for transparency and future
re-runnability, **not** as reproductions of the book's exact figures. The
at-snapshot column is the load-bearing honesty move — it rules out "they'll match
once you account for growth" and shows the book's predicate is genuinely
different (and undocumented). If the book wants the *exact* 208/27/993 refreshed,
the precise original predicate must be re-specified; this archaeology flags that
the predicate is undocumented.

## Recurrence classification — CONSERVATIVE (the load-bearing discipline)
Per the brief, the last items are treated with extreme conservatism. The
`recurrence_classification` field uses strictly distinct categories:
- **attempted-recurrence-caught** (5 episodes) — a later attempt at the
  prohibited pattern was blocked by the control (e.g. the canonical-PDF-library ban-lint, the
  F10 wiring lint, the a11y_ prefix lint fire on every commit).
- **escaped-recurrence-caught-by-human** (1) — GC03: a bypass path was found by
  human review, NOT by the control. The control did not catch it.
- **later-hardening** (1) — GC01: a follow-on incident ("slow is not dead")
  hardened the control; a related but DISTINCT failure, not a recurrence of the
  original retry-storm class.
- **no-observed-recurrence** (4) — no later instance observed. **This is NOT
  evidence the control prevented one.** Absence of a later observed failure is
  explicitly not treated as proof of prevention.
- **deliberately-not-enforced** (1) — GC10: measurement kept without a gate on
  purpose.

Small N (12 conversion episodes). F9/F11 are "a documented, named, growing
discipline" (the book's own framing), NOT a measured causal rate. The book's
own limitation note is preserved: no clean fire→control causal fraction exists.

## Exclusions
- Confirmations (CF01–CF03) are ex-ante designs that *survived* pressure, not
  failure-driven conversions. Counted separately; never mixed into the
  conversion totals or F10.
- The mechanical 208/27 counts and the curated episodes are DIFFERENT
  populations (one is a commit/lint-text footprint of the discipline, the other
  is the narrative set of strongest episodes). Do not sum them.
