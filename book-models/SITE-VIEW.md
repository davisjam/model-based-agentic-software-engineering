# The site as a view of the book models

The published site is not a separate authored artifact. It is a **projection** of the book's typed
models — the same discipline the book itself uses (documentation, at its limit, is a typed model). This
document records that design: what the site projects, from which models, how the projection stays
faithful, and where the site is deliberately hand-authored rather than derived.

The companion audit — every site framing walked and mapped to its model backing, with the gaps flagged —
lives in [`SITE-ALIGNMENT.md`](SITE-ALIGNMENT.md). This file states the design; that file states the
current state against it.

## The thesis this realizes

The project's standing rule is **book coverage ⊇ site framings** (`CLAUDE.md`, "Site is a preview; the
book claims and expands"). The site is a preview: concise framings and entry points. The book claims and
expands each idea. So any conceptual framing on the site owes a fuller treatment in the book.

A projection turns that rule from a promise into a mechanism. When a landing section reads its content
from a model instead of carrying hand-written prose, re-running the model re-syncs the site — the map
cannot silently diverge from the territory, because there is only one territory and the map is generated
from it.

## What the site projects, and from which model

Three landing surfaces are derived views. Each reads a model at build time and renders it; none carries
the content as hand-authored HTML.

- **The four definitions** — `model`, `agent`, `engineering`, `software engineering`. Source:
  [`book/data/definitions.json`](../book/data/definitions.json). Each record holds the green-box
  definition, the per-aspect elaboration, and its traceability (site home + owed book home). The build
  (`_landing_definitions` in `catalog.py`) renders one `def-<slug>` card per record. The card id equals
  the record's `site_home`, the join key the drift check asserts.

- **The core learning outcomes** — the book-level and Part-level "you'll be able to…" spine. Source:
  the outcomes model [`book-models/outcomes.json`](outcomes.json), **selected** by the thin sidecar
  [`book/data/outcomes-site.json`](../book/data/outcomes-site.json). The sidecar is deliberately thin: it
  declares only *which* outcomes the site surfaces (a selection policy) and each one's book-home link —
  never the outcome prose, which is read straight from the model. The build (`_landing_outcomes`) renders
  one `outcome-<slug>` row per selected outcome, its statement and Bloom verb taken from the model.

- **The book models as a reading view** — a browsable HTML rendering of the outline (heading tree +
  topic sentences) and the outcomes, keyed to their units. Source: `outline.json` + `outcomes.json`.
  The renderer [`render_models_view.py`](render_models_view.py) emits [`models-view.html`](models-view.html);
  the landing's outcomes section links to it. This is the models offered as an *alternative reading of
  the book*, not a landing framing — the outline and every outcome, book / Part / chapter / section, in
  one place.

The concept cards, the two principles, and the mechanism-class cards trace to a fourth model,
[`book/data/concepts.json`](../book/data/concepts.json) — but as **traceability**, not as a rendered
projection. concepts.json records each core concept's kind, its site realization, and its status; its
four audit-only lints (L1–L4 in `tests/html.py`) assert the site card and the book `index-def` tag both
resolve. The prose in those cards is still hand-authored on the landing. See `SITE-ALIGNMENT.md` for the
mismatch this leaves and whether to close it.

## How the projection stays faithful — the drift checks

Each projection carries a build-time drift check. A projection with no gate is prose that rots; the gate
keeps the map equal to the territory. All three land **audit-only-first** (they print findings and let
the commit through) — the repo's discipline for a new check on a tree that may still carry seed
findings; a follow-up promotes the surface to blocking once the findings drain.

- **Definitions** — `check_definitions_site` (`tests/html.py`) joins on the slug and asserts both
  directions: every model record's `site_home` resolves to a real id on the built landing (modeled →
  projected), and every `def-<slug>` on the landing has a backing record (no unbacked site definition).

- **Outcomes** — `check_outcomes_site` asserts the selection is valid (every projected id resolves to a
  real outcome), the policy is honest (every policy-eligible book/Part outcome is projected or explicitly
  excluded — no core outcome silently dropped), and each selected outcome actually rendered a row.

- **Models view** — `check_models_view_site` asserts the committed `models-view.html` equals a fresh
  render from the current models. That single freshness assertion subsumes structural drift: the renderer
  reads the artifacts, so a rendered section or chapter cannot point at a node the models do not contain.

All three are surfaced by `catalog.py views-audit`, the fast pre-commit entry point over the book models
— so a committer sees site-projection drift in the same place as outline/outcomes/reverse-index drift.

## Tracked vs. generated — the models view

`models-view.html` is **tracked in git, not gitignored**. That mirrors how the repo treats the rest of
the site HTML: GitHub Pages serves the committed `.html` (deploy-from-branch), and the tracked
`pre-commit` hook keeps the committed HTML in sync with its source on every commit; CI re-runs the build
on push as the source of truth. So the hook re-renders `models-view.html` and stages it alongside the
site build. (The book PDF and the skill bundle's `plugin/**/*.html` are the deliberate *gitignored*,
regenerated-only exceptions — a multi-MB binary and a CI-rebuilt bundle. A small, text-diffable HTML
reading view does not belong in that set; tracking it makes its content reviewable in a diff and served
without a build step.)

## What stays hand-authored — the site-only surface

Not everything on the site is a projection, and it should not be. Site-only material is limited to
**adoption and navigation**: the quick-start, the nav grid, the template downloads, the skills cards, the
"explore the catalogue" census. concepts.json lists these as `_site_only_cards` — model-exempt by design,
because they have no conceptual counterpart the book owes. A framing is a projection candidate only when
it makes a *conceptual* claim; a "download the templates" card makes none.

## The build order

`catalog.py build` renders the site; the projections are spliced into the landing at build time
(`_landing_definitions`, `_landing_outcomes`). The models view renders separately (its own script), so
it never slows the site build; the hook runs both. The order inside the hook: validate → build the site →
render the models view → stage → run `views-audit` (audit-only). A broken schema never builds; a stale
projection never commits.
