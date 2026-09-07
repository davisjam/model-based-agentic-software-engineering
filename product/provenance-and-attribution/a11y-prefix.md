# `a11y_` prefix convention

**Intent** — A reserved naming prefix that marks tool-inserted, invisible-to-author artifacts (user-visible
insertions keep ordinary names), so inserted content is distinguishable from authored content and a
validator can cover it by prefix (our instance: the `a11y_` prefix + `InsertedContentValidator`).

| | |
|---|---|
| Summary | Prefix invisible inserts so they're distinguishable and tracked. |
| Target | Product · **Provenance & attribution** |
| Form | `repair-vocab` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Hard** (deterministic) — the `InsertedContentValidator` covers every registered insert |

*Its place in the environment — a **variant / known-use** of **Caused-By Provenance**, under **PROVENANCE · Track provenance and trace causes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

The tool *inserts* content: alt text, tags, off-canvas scaffolding. Mixing tool-inserted content with
author-written content risks two failures: presenting invisible scaffolding *as if* the user wrote it,
or an insert that isn't tracked and so isn't validated. The failure is *untracked or mislabelled
inserted content*, and it recurs per inserter and per insertion site.

## Why it's not just "name things sensibly" (or "keep a list of inserts")

Ad-hoc naming and a hand-maintained list are the two ways to fail here: neither is *checkable*, and the
list drifts the moment an inserter forgets to append. The `a11y_` prefix is a **convention with a rule**
(invisible → `a11y_`, user-visible → not, spec-mandated → the spec name) that the inserted-content
validator *relies on*, and every new inserter records itself with the registry so the validator covers
it **automatically**. Naming by rule plus auto-registration is what makes the coverage mechanical rather
than a promise. It is a repair-vocabulary constraint: it bounds *how inserts are named and tracked*, which
makes validating them possible.

## Mechanism

Invisible inserts are prefixed `a11y_` (the invisible-insert prefix convention); user-visible inserts are not; spec-mandated names keep
their spec name. New inserters call `registry.Record(...)`, so the `InsertedContentValidator`
automatically covers them; off-canvas placement uses dynamic geometry so it never bleeds on-page.
Per-site corollaries live in the placement-audit doc.

## Prerequisites

- **The naming convention** (the three-way rule) applied at every insertion site.
- **A registry** inserters record into, and a **validator** that reads it.

## Consequences & costs

- **Adherence is partly discipline.** A mis-named or unregistered insert escapes coverage until caught.
- **Spec-mandated names are exceptions** to the prefix rule (by necessity), a small carve-out to track.
- **Every inserter must call `registry.Record`** — the auto-coverage only works if the registration
  habit holds.

## Known uses

- The `a11y_` prefix convention and its per-site corollaries.
- `registry.Record(...)` + the `InsertedContentValidator` (automatic coverage of registered inserts).

## Related mechanisms

- **Consumer** — the `InsertedContentValidator` reads the registered inserts (naming + registration are
  what it depends on).
- *See also (sibling)* — [remediation-verbs](../repair-vocabulary/remediation-verbs.md): both bound the
  remediator's move-space; this one bounds how *inserted content* is named and tracked.
