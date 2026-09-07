# Codemod-first threshold (N≳50 → AST transformer)

**Intent** — For a large mechanical backlog (N≳50 sites with a deterministic fix shape), author *one
AST-level transformer* instead of dispatching N agents, bounding *how* large mechanical changes are
made.

| | |
|---|---|
| Summary | For 50+ deterministic sites, write one AST transformer. |
| Target | Product · **Repair vocabulary** |
| Form | `repair-vocab` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Soft** (probabilistic) — a discipline/threshold guiding *how* a mechanical backlog is fixed; nothing blocks N per-site edits, though the transform it produces is itself deterministic |

*Its place in the environment — a **variant / known-use** of **Closed Action Vocabulary**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A large mechanical lint backlog (say 200 sites all needing the same deterministic edit) tempts one of
two bad responses: dispatch N agents (expensive, and each introduces per-site drift) or hand-edit them
(slow and inconsistent). The failure is *N inconsistent hand/agent fixes for a change that is actually a
single deterministic transform*, and it recurs at every large mechanical backlog.

## Why it's not just "dispatch an agent per site" (or "fix them by hand")

N agents on a *deterministic* fix is the wasteful path: each agent re-derives the same edit slightly
differently, and 200 of them is 200 chances to diverge. A **single AST transformer** applies the *exact
same* transform everywhere, deterministically, in one reviewable artifact. A codemod-first rule sets the
threshold: N≳50 + deterministic shape → codemod; genuine per-site *judgment* → an agent per site. One
deterministic AST transform replaces N judgment-free agent edits and cannot drift between sites. Codemods
are kept as **deprecated reference exemplars** so the next backlog starts from a working pattern.

## Mechanism

The codemod-first rule triggers a codemod when N≳50 sites share a deterministic shape; the transformer
operates at the AST level (e.g. an inline-import hoisting codemod). A pre-commit-skip rule lets a
codemod-class commit skip the pre-commit
*lint* stanza (with a `pre-commit-skip: <reason>` marker; unit-tier still runs), since the transform is
mechanical. Finished codemods are marked deprecated and cross-referenced as paste-ready exemplars.

## Prerequisites

- **An AST toolkit** for the language and a **deterministic fix shape**.
- **The threshold judgment** (N≳50, deterministic vs per-site judgment).
- **The pre-commit-skip protocol** for codemod waves.

## Consequences & costs

- **Writing the transformer is upfront cost.** It pays off only at scale, which the threshold
  encodes.
- **Only for deterministic shapes.** A backlog needing per-site judgment still goes to a per-site agent,
  not a codemod.
- **Skipping the lint stanza is a scoped hole** — justified by the transform's mechanical nature,
  marker-audited.

## Known uses

- The N≳50 codemod threshold; AST transformers such as an inline-import hoisting codemod.
- The `pre-commit-skip` for codemod-class waves; codemods retained as deprecated exemplars.

## Related mechanisms

- *See also (sibling)* — [typed-categories](typed-categories.md), [remediation-verbs](remediation-verbs.md):
  the other bounded-move constraints; this one bounds *how a mechanical change is executed*.
- *See also (cross-target)* — this is the product-side face of the same codemod-first discipline the
  agent fleet uses for its own mechanical lint backlogs.
