# The editing user story — you give intent, the agent owns model↔prose sync

The book has two coupled representations: the **prose** (`book/**/*.md`) and the **models** (outline points,
outcomes, concepts, principle-weave, …). The author should never have to keep them in sync by hand.
Model↔prose consistency is a **governed, checked property** — the book's own thesis applied to authoring the
book — not a discipline held in anyone's head.

## Co-location minimizes what can break (the "mirror" principle)

As much of the model as possible lives **inline in the prose**, so editing the prose *is* editing the model
— nothing separate to sync:
- **Outline points** → `<!-- point: <canonical> -->` decorators above each paragraph (**model-from-decorator**:
  move the paragraph, the point moves with it).
- **Concept anchors** → `<!-- index-def: slug -->`; **float labels/refs** → `<!-- label: k -->` / `[ref:k]`.

These are the "pointers-**and**-content" mirror — the outline is *derived from* the decorators, so a prose
edit and its model edit are one atomic local change. What CANNOT co-locate is the **cross-cutting** model —
an outcome spanning several sections (primary + elaborative units), the principle-weave — which lives in
`book-models/` model files and *references* the prose. Those are guarded by the drift audit.

## The safety net — the 3-kind drift audit (why the author can edit freely)

A direct prose edit CAN strand a model reference — and the audit makes that **detected, never silent**, so
the agent reconciles:
- **Structural** (pre-commit lint, `catalog.py views-audit` + reverse index): a renamed/deleted section a
  model pointed at reddens.
- **Freshness** (pre-commit lint): a paragraph whose `<!-- point: -->` decorator is now stale reddens
  (re-derive vs committed).
- **Semantic** (review-gate **agent** audit): a paragraph whose *meaning* drifted from its point-decorator —
  a sense mismatch — flagged by an agent judging `(point, paragraph)` pairs. (Non-mechanical, review-time.)

The author does not notice what broke; the audit notices, the agent fixes.

## The three edit shapes — pick whichever is natural

1. **"Land this prose change."** (Hand the agent an edit, or edit the `.md` and say reconcile.) The agent
   applies the prose, re-derives the inline model bits (points, anchors), updates the cross-cutting model
   files *if the teaching changed*, runs the drift audit, and surfaces any semantic mismatch / new gap for
   the author's call.
2. **"Change the model like so."** (An outcome / outline point / concept.) The agent updates the model AND
   checks the prose still delivers it — if not, that is a gap the agent flags (or writes the prose to fill,
   on request). Model→prose.
3. **"I already edited the `.md`."** The pre-commit audit catches the fallout; the agent reconciles on its
   next pass. The author is not responsible for knowing what broke.

Both directions (prose→model, model→prose) are handled; the reconcile is bidirectional.

## The reconcile pass (what the agent runs after any edit)

1. Re-derive the co-located models (outline points from decorators, anchors).
2. Run the drift audit (structural + freshness).
3. Fix the obvious drift automatically (a re-derivation, a moved anchor).
4. Surface the **semantic / gap** questions that need author judgment (a paragraph whose point no longer
   matches; a model change the prose doesn't yet deliver).

The author says "here's the change"; the agent returns it reconciled, with "done + here are the N judgment
calls."

## Current vs target

- **Live today:** structural + freshness drift (pre-commit, audit-only); the reverse index.
- **Lands with the drain:** the `<!-- point: -->` decorators (model-from-decorator) + the semantic
  review-gate agent audit. After the drain, the checks flip **blocking** and the full "edit freely, the
  agent reconciles" story is realized.
