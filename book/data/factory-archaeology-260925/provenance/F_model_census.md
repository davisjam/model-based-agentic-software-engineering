# Provenance — F: Mature-factory anatomy (model census)

## Datasets
- `data/model_census.csv` — row per declared model: `file | model | form |
  target_kind | target | form_secondary | kind_secondary | purpose`.
- `data/model_census_form_by_target.csv` — the T1 form × target cross-tab
  (+ totals row).
- `data/model_census_specimens.csv` — T2, the six §5.2 specimen rows
  (engineering question | representation | consumer | supervisory consequence).
- `data/model_structural_metrics.csv` — structural counts (declared models,
  INV- IDs) with book cross-refs.

## Figures
- **F21 + F22** `f21_f22_model_census.py` — horizontal bars by form (F21) and by
  target (F22), two panels (the SNAPSHOT at HEAD; retained).
- **F21b** `f21b_model_forms_longitudinal.py` — the LONGITUDINAL companion (R4):
  model accumulation over project weeks + the by-form split where declared. See
  "Longitudinal by-form reconstruction" below.
- **T1** is `model_census_form_by_target.csv` (a table, not a plot).
- **T2** is `model_census_specimens.csv` (curated from the book table).

## Datasets (longitudinal, R4)
- `data/model_form_weekly.csv` — declared-model count BY FORM at each week's
  last-commit tree (`project_week`/`week_start`/`sha`/`total_models` + one column
  per form), reconstructed by re-parsing `MODEL_FORM`/`MODEL_KIND` at each week
  SHA (the same static parse the HEAD census uses). Emitted by
  `factory_archaeology.py model-form-weekly`.

## Longitudinal by-form reconstruction (R4) — method + a real limitation
The census was reconstructed at every week's last-commit tree the way the total
accumulation was traced. The **finding is itself a data point about the factory**:
the `MODEL_FORM`/`MODEL_KIND` taxonomy is a **late-arriving property**. It was
introduced in a bulk back-classification wave on **2026-09-17 (project week 28)** —
`git log -S "MODEL_FORM ="` first appears there. Before W28, `total_models` is **0**
even though the system-model **.py files accumulated smoothly** (~99 files at W20,
~271 at W27, ~297 at HEAD; see `control_growth_weekly.system_model_py_files`).

**What is and is not reconstructable:**
- **Model-file accumulation over time**: reconstructable and smooth (F21b panel A,
  from the .py file count) — this is the honest "models accumulate" longitudinal.
- **Per-form split over time**: **NOT reconstructable before W28.** Form is a
  declared attribute that did not exist earlier; assigning a form to a pre-W28
  file would require guessing it — that is fabrication, and is not done. The
  by-form stack (F21b panel B) is therefore shown only for the weeks where the
  taxonomy is declared (W28+), which at this HEAD is effectively the snapshot
  (129 models; 50/17/12/11/10/8/7/4/4/4/2). Annotated as such on the figure.

This is the same posture as section B/C: retain missing, document the limit, do
not manufacture a series the evidence cannot support.

## Source & method
Each model under `system-models/*.py` declares, at module scope, two bare-string
taxonomy axes enforced by a project lint (`lint-model-kind-declared.py`, which
walks the `ModelRegistry` reused from `system-models/repo-query.py`):
- `MODEL_FORM` ∈ {STATE_MACHINE, DATAFLOW, TOPOLOGY, INTERACTION, REGISTRY,
  SCHEMA, CONSTRAINT_SET, DECISION_TABLE, POLICY, BUDGET, INSTRUMENT}.
- `MODEL_KIND` ∈ {PRODUCT, AGENT_META, ENVIRONMENT} — the *target* axis
  (product / agent-factory / execution-environment).
Plus optional `MODEL_FORM_SECONDARY` / `MODEL_KIND_SECONDARY` tuples.

The miner reads each `system-models/*.py`, extracts the bare-string `MODEL_FORM`
and `MODEL_KIND` (regex on the module-scope assignment), and counts a file as a
declared model only when it carries BOTH. This is a faithful, no-import static
parse (the same invariant the lint relies on).

## Classification: EXACT + VALIDATED
This reproduces the book **exactly** at this revision:
- Count: **129 declared models** (book: 129).
- By form: REGISTRY 50, INSTRUMENT 17, BUDGET 12, SCHEMA 11, CONSTRAINT_SET 10,
  DATAFLOW 8, TOPOLOGY 7, STATE_MACHINE 4, DECISION_TABLE 4, POLICY 4,
  INTERACTION 2 — **identical** to the book's 50/17/12/11/10/8/7/4/4/4/2.
- By target: product 77, agent/factory 51, execution-environment 1 — **identical**
  to the book's 77/51/1.

The book noted the census "had already drifted by one" between two revisions;
at this mining HEAD it sits exactly on the published 129. If it drifts, re-run
`factory_archaeology.py model-census`.

## Structural metrics — mixed confidence
- `declared_models = 129` — **exact**.
- `system_models_py_files_total = 297` — exact count of all `.py` under
  `system-models/` (includes helpers, tests, `_typed_primitives.py`, non-model
  modules); NOT the model count.
- `distinct_INV_ids` — a **loose upper proxy, NOT the book's figure**. Our regex
  (`INV-<TOKEN>` across `system-models/` + `docs/`) returns ~3865, far above the
  book's DEEPENING-axis 2→45→154. The book's 154 used a narrower registry-based
  definition of *registered* invariant IDs at a specific window; our text-token
  sweep over-counts every `INV-` mention (cross-references, examples, per-Epic
  scoped IDs). Reported for transparency; **treat the precise registered-invariant
  count as unavailable via this method** — the invariant registry would need to be
  queried directly to reproduce 154.

## Requested-but-unsupported (section F)
- **# model consumers / # joins between models / # controls generated from
  models** — the "consumer"/"join" relationships exist in the models (e.g.
  `VERIFIED_BY`, service-flow edges, the invariant→checker derivation) but there
  is no single queryable count that reproduces a book figure. Extracting a
  defensible consumer/join count would require walking each model's declared
  consumers via `repo-query.py` and is deferred rather than approximated. Marked
  as a planned extension, not fabricated.
