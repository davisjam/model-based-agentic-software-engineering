The seven stacks before this one are examples. The reusable skill is composition. Start from the capability,
not the mechanisms — here is how.

## 1. Name the capability

Prefer

> Every consequential mutation is reconstructable.

over

> We need provenance logging.

The first states the engineering result. The second has already chosen a mechanism, before you know whether
it is the right one or the only one.

## 2. Enumerate the failure classes

Ask what would make the capability claim false. For reconstructable mutation:

- the actor is unknown;
- a record is missing;
- a bypass path exists;
- history cannot be joined;
- the transformation silently loses semantics.

Those failures tell you what the composition has to cover. Nothing else does.

## 3. Assign one guarantee to each failure

Map each way the claim can break to the guarantee that closes it.

| Failure | Guarantee |
|---|---|
| actor unknown | attribution |
| record missing | emission |
| bypass exists | coverage |
| history fragmented | stable identity / join |
| semantic loss | fidelity check |

Do not add a mechanism because the case you are copying from used it. Add it because a failure class needs
its guarantee.

## 4. Find the dependency among guarantees

Some guarantees only become meaningful once another exists.

    MARK  →  EMIT  →  COVER  →  READ

A completeness checker proves little before there is a defined population of events to account for. This
dependency is what turns a list of mechanisms into a stack.

## 5. Separate the load-bearing path from the enhancements

For each mechanism, ask:

> If I remove this, can I still honestly make the capability claim?

If yes, the mechanism may be valuable — but it is not load-bearing. That is the distinction the spreads draw
as a solid path and a dashed attachment.

## 6. Match the substrate

Do not reproduce a stack from this appendix because it appears here. A database, an embedded controller, a
compiler, a SaaS application, and a research codebase each expose different observable facts and different
deterministic seams. Preserve the guarantees; let the substrate decide the mechanisms.

## 7. Stop

The objective is not maximum governance. It is the smallest composition that makes the capability claim
honest for the failure classes that matter. That is the same economy Part II applies to models: build enough
explicit structure to answer the engineering question, then stop.

## The method in one picture

<!-- label: appendix-a-composing-a-stack -->
<!-- figure: assets/appendix-a-composing-a-stack.svg | Composing an engineering stack. Begin with a capability and the ways it can fail. Select mechanisms for the guarantees required to close those failures, check which guarantees depend on which, and retain only the composition needed to make the capability claim honest — that load-bearing composition is the stack. -->

Begin with a capability and ask what makes it false. The failure classes fan out; each takes a guarantee, and
each guarantee takes a mechanism. Check which guarantees depend on which, keep only the composition that
makes the claim honest, and the load-bearing remainder is your stack.

Unlike a catalog of installed subsystems, this teaches a transferable engineering skill: start from a
capability and its failure classes, then compose only the guarantees needed to make the claim honest.
