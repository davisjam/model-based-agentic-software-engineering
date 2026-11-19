# Figure fill audit: Chapters 2–4

Reviewed 2026-11-18 against the current native figure proofs and regenerated chapter PDFs: **42 distinct figures** (19 in Chapter 2, 11 in Chapter 3, 12 in Chapter 4). This is a fill-policy review, not a general layout review.

## Finding

The shifts are partly inherited drawing styles, not a dependable semantic code. The attached editorial note predates the latest redraw: **2.13 now has white nodes**, and **2.10 also has white state boxes**. Thus neither “all service nodes are gray” nor “all behavioral states are gray” describes the current manuscript.

Use **white as the default, gray for meaning or useful emphasis**. Do not gray Figure 2.15 merely to match 2.14. Instead, remove the unexplained fills in **2.11, 2.12, and 2.14**, preserving their approved layouts. Keep the meaningful distinctions and group backgrounds listed below. The audit identifies three targeted revisions, not a wholesale redraw.

This recommendation does not equate gray with engineering models. Figure 3.1 shades Alignment functions and leaves models white; Figure 4.10 shades model concepts; Figure 4.12 shades validation work. Each has a clear local key. Figure 4.11 uses pale bands for all three stages, including evidence. A universal rule would damage these distinctions.

## Persistent policy and execution prompt

- [Drawing policy](../../plugin/mage/skills/self-communicate/drawing/figures.md#fill-and-shading-meaning-before-decoration)
- [Author-agent revision prompt](prompts/figure-fill-revision-chapters-2-4.md)
- Local contact sheets and machine-readable figure inventory: `scratchpad/figure-fill-audit-20261118/` (gitignored). Figures were inspected as rendered, using the current assembled chapter order and LaTeX label numbers, rather than inferred solely from source colors.

## Figure-by-figure disposition

| Figure | Asset identifier | Current treatment | Meaning / justification | Proposed action |
|---|---|---|---|---|
| 2.1 | `realization-space` | Gray set; hatched intersection | Regions and intersection distinguish constraints and acceptable implementations. | Keep |
| 2.2 | `specified-region` | Gray obligation; white scaffolding/freedom | Contrasts obligatory properties with supporting guidance and open choices. | Keep |
| 2.3 | `multiple-routes-to-engineering-models` | White nodes; heavier focal outlines | Sources, model, and uses are distinguished by layout and labels. | Keep |
| 2.4 | `modeling-repertoire` | White diagrams; pale family headers | Headers organize the repertoire; no arbitrary role fills. | Keep |
| 2.5 | `sensor-buffer-radio` | White nodes; dashed trace highlight | Structure, parameters, rules, and derived trace remain distinct without fill. | Keep |
| 2.6 | `question-to-consequence-progression` | White process boxes | Labels and sequence provide the hierarchy. | Keep |
| 2.7 | `canonical-structural` | White components; crossed dashed bypass | Line style encodes the forbidden relationship. | Keep |
| 2.8 | `document-mutation-model` | Gray structured-document seam; white surrounding nodes | Highlights the mandatory abstraction boundary. | Keep |
| 2.9 | `from-nodes-to-composition` | White ellipses, pale diamonds, darker rectangles | Legend explicitly distinguishes read-only, patch-producing, and direct-edit computations. | Keep semantic palette |
| 2.10 | `canonical-behavioral` | White state boxes | Transitions and annotations carry lifecycle semantics. | Keep; behavioral baseline |
| 2.11 | `recovery-ordering-model` | Gray states; slightly different terminal fill | Ordinary states need no additional fill code; comparison with 2.10 exposes the inconsistency. | Whiten states; preserve approved compact geometry |
| 2.12 | `in-flight-ownership-states` | Gray owned/unowned; paler reclaimable | No explained fill code; labels already identify ownership and expiry. | Whiten states; retain callout and orthogonal return |
| 2.13 | `observed-vs-declared` | White nodes in both panels | Latest author reference; observed violation is encoded by dashed path and cross. | Keep; policy-graph baseline |
| 2.14 | `service-flow-model` | Uniform gray service nodes | No contrasting category or focal node; differs arbitrarily from 2.13 and 2.15. | Whiten nodes |
| 2.15 | `entitlement-domain` | White entitlement and decision nodes | Relationships and labels distinguish the entities and outcomes. | Keep; do not gray merely to match 2.14 |
| 2.16 | `entitlement-model-evolution` | White narrative nodes; dark rejection outcome | Dark bar highlights the failure that motivates the repair. | Keep |
| 2.17 | `derive-generate-trace` | White model containers; gray table headers and implementation portions | Headers organize data; generated/corresponding portions are explicitly labeled. | Keep |
| 2.18 | `modeling-substrate` | Gray central hub; white surrounding models | Highlights the shared-identity traversal; numbered path also carries emphasis. | Keep |
| 2.19 | `two-reductions-static-realized` | White nodes and panels | Edge labels and panel headings distinguish static dependencies from recorded history. | Keep |
| 3.1 | `alignment-overview` | Gray constraints, sensors, gates; white other elements | Existing legend defines Alignment functions. Models themselves are white. | Keep; evidence against universal model=gray |
| 3.2 | `intervention-boundaries` | Pale enforcement region; white cards | Region separates enforcement boundaries from guidance. | Keep |
| 3.3 | `docable-context-selection` | Pale knowledge-resource container; white operations | Grouping identifies the shared resource independently of execution flow. | Keep |
| 3.4 | `three-relations` | Gray headers, regions, obligations, judgment boxes | Explicit labels and nesting establish roles; parallel judgments receive equal emphasis. | Keep; no fill-only redesign |
| 3.5 | `semantic-gap` | Gray validation-level headings and checkpoints; white pipeline | Paired bands organize the two levels of evaluation. | Keep grouping hierarchy |
| 3.6 | `constraint-vs-sensor` | Gray constraint/sensor/gate; white model and outcomes | Consistent with Alignment-function emphasis in 3.1. | Keep |
| 3.7 | `match-mechanism-to-property` | White obligations/mechanisms; gray concluding function bands | Parallel gray bands summarize the different mechanisms. | Keep |
| 3.8 | `cost-enforcement-gradient` | Gray acceptable region and labeled obligation/measurement chips | Highlights tolerance and observed values; labels and positions preserve meaning. | Keep |
| 3.9 | `governance-conversion-fig` | White boxes throughout | Branch labels and topology explain governance conversion. | Keep |
| 3.10 | `honest-gaps` | White question and outcome boxes | Explicit labels distinguish unresolved, evaluated, and governed outcomes. | Keep |
| 3.11 | `census-trio` | Gray panel headers; white entities | Headers organize three views; dashed outlines identify gap/orphan candidates. | Keep |
| 4.1 | `engineer-agent-interaction` | White nodes and two framed views | Labels and topology distinguish Modeling and Alignment. | Keep |
| 4.2 | `active-passive-alignment` | Pale phase containers; white internal nodes | Groups active convergence and passive preservation. | Keep |
| 4.3 | `alignment-kernel` | Nested gray regions and labeled rings | Shows kernel and growth of governed surface; nesting carries meaning redundantly. | Keep |
| 4.4 | `agentic-engineering-cycle` | White process boxes | Cycle, brace, and labels carry the lesson. | Keep |
| 4.5 | `interlude-execution-unit` | Gray media/external-media elements; white structure | Media residence versus references is central to the comparison. | Keep semantic contrast |
| 4.6 | `interlude-graph-two-partitions` | Pale execution groups; white actions | Groups show page partitions versus ready frontiers. | Keep |
| 4.7 | `interlude-analysis-before-build` | Gray dominant/modified operations and shared context | Existing legend defines the highlighted class. | Keep |
| 4.8 | `interlude-latency-floor` | Pale critical-chain enclosure and result strip | Highlights dependency chain and resulting latency floor; dashed border and labels agree. | Keep |
| 4.9 | `interlude-prediction-residual` | Gray panel headers and residual box | Headers organize sequence; focal residual is the quantity being explained. | Keep |
| 4.10 | `discovering-latent-models` | Gray latent concept/model substrate; white steps/artifacts | Existing key explicitly defines this local distinction. | Keep local model encoding |
| 4.11 | `model-aware-change-impact` | Pale model, obligation, and evidence bands; white child nodes | Bands organize stages; they do not universally mark model-related objects. | Keep grouping |
| 4.12 | `docable-validation-scheduling` | Gray validation operations; white other process steps | Existing legend says shading means validation is running. | Keep semantic encoding |

## Scope and evidence limits

The three proposed fill revisions have **not** been applied in this pass. The author-agent prompt directs their implementation and verification. The preceding requests for Figure 2.13 and the invariant inset were implemented separately and rebuilt before this audit. Keep those edits and the compact layouts of Figures 2.11–2.12.

Retaining a figure here means its fill treatment is justified for this task; it does not certify every aspect of its prose, layout, or technical content. Preserve local palettes unless a rendered comparison establishes a real ambiguity. The small differences in the ordinary state fills of 2.11–2.12 have no stated teaching function, so adding a legend would add complexity instead of resolving the inconsistency.
