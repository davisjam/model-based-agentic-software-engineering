# Canonical walkers (one traversal per tree)

**Intent** — Give each tree exactly one canonical walker that owns its traversal invariants, and route
all traversal through it instead of ad hoc recursion, so those invariants live in one place (our
instances: one walker for the PDF structure tree, one for the checking pass, one per Office part:
`PdfStructTreeWalker`, the `RuleWalkers`, `DocxTopLevelPartWalker`).

| | |
|---|---|
| Summary | One canonical traversal per tree, not ad hoc recursion. |
| Target | Product · **Canonical models & seams** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) · *blocking* — routed via the model ban-lints; raw recursion / regex-into-tree is banned alongside raw library access |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **One Door Enforced**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Ad hoc tree recursion re-implements traversal at every site, and each copy is subtly wrong in its own
way. One misses a node type, another visits in the wrong order, a third forgets link annotations. The
same traversal bug recurs per site, and because each is hand-rolled, a fix to one never reaches the
others.

## Why it's not just "recurse the tree where you need it"

Hand-rolled recursion **duplicates the traversal logic**, and duplicated logic drifts: the invariants
(visit every node type, in the right order, resolving indirect references) get re-derived, badly, at
each site. A canonical walker **centralizes** the traversal so those invariants are fixed once and
inherited everywhere. N ad hoc recursions each re-introduce the same class of omission; one canonical
walker cannot, because there is only one copy of the traversal to get right. A standard
DRY-plus-walker-discipline move, it keeps the structured models usable without re-opening the raw-access
door.


## Mechanism

Each tree type has one canonical walker that owns its traversal shape: one for the PDF structure tree,
one for the checking pass, one per Office part (our instances: `PdfStructTreeWalker`, the `RuleWalkers`,
`DocxTopLevelPartWalker`). The canonical-walker discipline routes all traversal through them; regexing
into the tree or hand-recursing is banned together with raw library access.

## Prerequisites

- **A walker per tree type**, exposing the traversal shape callers actually need.
- **A discipline (and lint coverage) that routes traversal through it**, closing the raw-recursion and
  regex-into-tree escapes.

## Consequences & costs

- **The walker must expose what callers need.** A missing traversal shape pushes a caller back to raw
  recursion; coverage matters here, same as the models.
- **Low novelty.** This is a well-understood pattern; its value is DRY + invariant-centralization, not
  invention.

## Known uses

- `PdfStructTreeWalker`, the `RuleWalkers`, `DocxTopLevelPartWalker`, and the other per-tree walkers.
- The canonical-walker discipline (traversal routed through the walker, raw recursion banned).

## Related mechanisms

- *See also* — [pdf-model](pdf-model.md), [office-models](office-models.md): walkers are *how you
  traverse* those structured models; they are part of the same typed-seam discipline.
- **Enabler** — a canonical walker makes routing traversal through the structured models practical;
  without it, callers reach for raw recursion and re-open the ban-lint's door.
