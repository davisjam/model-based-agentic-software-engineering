The seven preceding stacks are examples. The reusable skill is composition. Start from the capability, not the mechanisms.

## 1. Name the Capability

Prefer

> Every consequential mutation is reconstructable.

over

> We need provenance logging.

The first states the engineering result. The second has already chosen a mechanism, before you know whether
it is the right one or the only one.

## 2. Enumerate the Failure Classes

Ask what would make the capability claim false. For reconstructable mutation:

- the actor is unknown;
- a record is missing;
- a bypass path exists;
- history cannot be joined;
- the transformation silently loses semantics.

Those failures determine what the composition must cover.

## 3. Assign One Guarantee to Each Failure

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

## 4. Find the Dependency Among Guarantees

Some guarantees only become meaningful once another exists.

    MARK  →  EMIT  →  COVER  →  READ

A completeness check is meaningful only after the population to be accounted for has been defined. Dependencies among guarantees are what turn a list of mechanisms into a stack.

## 5. Separate the Load-Bearing Path from the Enhancements

For each mechanism, ask:

> If I remove this, is the capability claim still valid?

If yes, the mechanism may still be valuable, but it is not load-bearing. The diagrams represent this distinction with solid paths and dashed attachments.

## 6. Match the Substrate

Do not reproduce a reference stack mechanically. A database, an embedded controller, a
compiler, a SaaS application, and a research codebase each expose different observable facts and different
deterministic seams. Preserve the guarantees; let the substrate decide the mechanisms.

## 7. Stop

The objective is not maximum governance. It is the smallest composition that makes the capability claim valid for the failure classes that matter.

## The Method in One Picture

<!-- label: appendix-a-composing-a-stack -->
<!-- figure: assets/appendix-a-composing-a-stack.svg | Composing an engineering stack. Begin with a capability and its failure classes. Identify the guarantees required to close those failures, select mechanisms that provide them, determine their dependencies, and retain the smallest load-bearing composition that makes the capability claim valid. -->
