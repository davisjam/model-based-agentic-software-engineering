The lifecycle view makes the return on engineering capital concrete. A durable engineering asset changes the economics of later work when that work can inherit knowledge, judgment, evidence, or safe action from it rather than reconstructing them.

The return differs by surface. A product decision can prevent later teams from reconstructing why a capability exists. An architectural or behavioral model can make a later feature or repair cheaper to reason about. A structured ticket can connect one change to those longer-lived representations without reproducing them. A runbook can carry operational judgment from one incident to the next, and a deterministic procedure can retire the judgment altogether where its conditions become decidable. Traceability and executable assurance obligations can reduce the cost of establishing evidence after later changes.

The later change has not necessarily become simpler. Prior engineering has changed its economics.

This is the concrete meaning of engineering capital. Earlier judgment has been converted into structure from which later work inherits useful capacity.

That inheritance does not imply that one lifecycle stage is intrinsically automatable while another remains human. The relevant boundary cuts across the lifecycle. A maintenance ticket governed by established architecture, contracts, and acceptance machinery may require little new engineering judgment. Another maintenance ticket may expose an unstated invariant or require a new architectural choice. A new feature can likewise be routine realization under established obligations or can reopen the product and engineering questions that determine those obligations.

Nor should degrees of freedom be understood as a stock that autonomous realization simply consumes. For a given realization problem, governing obligations bound a space of choices engineering has deliberately left open. An agent may select within that space. An alignment repair may narrow it by making an existing obligation authoritative. Discovery of a tacit obligation may reveal that an apparent freedom was never genuine. New functionality can extend the system and create a new realization surface with new degrees of freedom. Engineering changes the space; realization operates within the space currently established for the change.

The economic consequence is a movement of judgment. Where the environment already carries the relevant knowledge and obligations, later work can proceed with less reconstruction and repeated decision-making. Where the environment cannot settle the question, judgment returns. If that judgment exposes something recurring or sufficiently consequential, governance conversion can promote the lesson into durable structure and change the economics of still later work.

[ref:tbl-h-capital] pairs each durable engineering asset with the later work that can inherit it.

<!-- label: tbl-h-capital -->
<!-- table: *Engineering capital across the lifecycle.* Each row names a durable engineering asset and the later work whose economics it changes when that work can inherit knowledge, judgment, evidence, or safe action rather than reconstructing it. The table reads across surfaces: capital created on one surface can be inherited by work on another, which is what lets local MAGE adoption compound into a product-wide return. [short: Engineering capital and the later work that inherits it] -->
| Engineering capital | Later work that can inherit it |
|---|---|
| Product rationale and accepted requirements | Feature proposals and change interpretation |
| Architecture, behavioral models, contracts, invariants | Features, repairs, refactorings, migrations |
| Structured change history and acceptance evidence | Maintenance and regression analysis |
| Topology, runbooks, operational predicates | Diagnosis, recovery, deployment, recurring response |
| Incident lessons converted into durable structure | Future engineering, maintenance, and operations |
| Traceability, checkers, and evidence models | Assurance after later changes |

This gives engineering capital a lifecycle interpretation. Its value is not the amount of structure accumulated but the future work that structure changes. Capital appreciates in use when new changes, incidents, and assurance questions can reuse old judgment; it depreciates when the represented knowledge ceases to fit or its carrying cost exceeds the work it saves.

Product-wide MAGE can amplify that return because capital created on one surface becomes available on another. An incident can produce an engineering invariant; the invariant can govern later maintenance; its evidence can support assurance; the resulting history can inform later product decisions. The models need not become one model. Their value compounds when useful relations allow engineering knowledge to travel.

The long-run product GEE is therefore not valuable because it contains everything known about the product. It is valuable to the extent that future work can inherit what earlier engineering learned.
