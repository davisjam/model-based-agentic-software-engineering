Engineering capital matters when an investment made in one place changes the economics of work elsewhere. Within a product, that effect is already visible: product decisions constrain later realization, engineering models support maintenance, incidents produce durable controls, and assurance evidence can accumulate rather than be rebuilt. A more conjectural question is whether such capital can also travel across products, teams, and organizations.

[ref:fig-h-capital] depicts the two dimensions. Within each product, engineering structure accumulates selectively across episodes. Across products, some concerns and mechanisms may travel while others remain local. The figure is conceptual, not a maturity model or quantitative measure of capital.

<!-- label: fig-h-capital -->
<!-- figure: assets/h9-capital-time-space.svg | *Engineering capital across time and space.* A conceptual snapshot of three products shaped by successive engineering episodes. Within each product, useful engineering structure has accumulated selectively; the incomplete constellations represent neither a prescribed product model nor a maturity level. Across products, an assurance obligation connects all three, code-quality mechanisms are shared by two, and connections to a common security posture remain possible. Solid relationships are established; dotted relationships are emerging or possible. -->

## Across Time: Capital Across the Product Lifecycle

Engineering capital does not appreciate by eliminating every future choice. A useful model fixes what later work should not have to rediscover while leaving irrelevant choices open. Over-specification creates carrying cost and can make later change more expensive. The valuable asset is therefore not maximal explicitness, but durable knowledge and authority over matters consequential enough to justify their cost.

Engineering capital can also gain new uses. An architectural model built to reduce reconstruction may later support incident diagnosis; maintenance traceability may support Assurance; an operational failure may produce an invariant useful to both Engineering and compliance. The value of the capital is therefore not the amount of structure accumulated, but the future work it changes.

## Across Space: Reusing Engineering Capital

Some engineering capital is product-local: the rationale for one change, the state of one system, or one deployment topology. Other assets may apply across products: security policies, regulatory obligations, protocols, accessibility requirements, architectural conventions, assurance arguments, validators, or evidence procedures. The question is whether capital that pays repeatedly across time can also travel across products, teams, or organizations.

Software engineering has pursued versions of this promise before. Object-oriented and component-based development sought reusable implementations; design patterns sought reusable engineering judgment. In practice, the legacy was at least as much a change in engineering principles—encapsulation, interfaces, composition, separation of concerns, recurring patterns—as direct reuse. Application-specific context and judgment remained difficult to package.

Commodity intelligence changes one premise. General reasoning capacity can be supplied separately from task-specific context and judgment. Code can carry implementation; models can carry represented context; judgment as code can carry decisions about obligations, evidence, and acceptable action. The consumer of reusable engineering judgment need no longer be exclusively human.

This permits reuse without prescribing a common realization. A security obligation, protocol model, accessibility rule, or assurance procedure can govern different implementations while leaving other choices open. A library gives later engineering something already built; reusable judgment gives it something already learned.

Whether commodity intelligence makes engineering judgment substantially more portable remains an empirical question. Context still travels badly. A judgment separated from the assumptions that made it valid can be worse than no reuse at all. Cross-product reuse therefore needs enough scope, provenance, applicability, and dependency information to determine when an asset still applies. The spatial reach of engineering capital must be tested, not assumed.

## Engineering Teams

Commodity intelligence and reusable engineering capital may also change how engineering responsibility is divided. An engineer supported by autonomous realization may own more components or a larger subsystem. More speculatively, engineers may own cross-cutting concerns—an architectural relation, authorization model, lifecycle protocol, resource invariant, accessibility obligation, deployment policy, or assurance claim—whose realizations span many components. Component ownership need not disappear, but implementation boundaries may cease to be the only natural unit of responsibility.

Smaller teams create a second risk. Large projects pay coordination costs, but they also aggregate diverse judgment: different engineers notice different assumptions, challenge different decisions, and recognize different failure modes. If autonomous realization lets fewer people govern the same scope, coordination cost may fall along with that diversity. A GEE does not automatically replace it: models preserve what was represented, and Alignment governs obligations already identified.

The organizational problem may therefore shift from coordinating enough people to realize the system toward ensuring enough independent judgment over it. Teams may need deliberate substitutes for perspectives once supplied incidentally by scale: independent inspection, heterogeneous agents, adversarial reasoning, or independent evidence. If fewer people can govern more engineering, preserving diversity of judgment may itself become an engineering obligation.
