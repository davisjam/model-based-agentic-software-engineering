**Engineering question.** What must we be able to demonstrate about the product?

Assurance and compliance organize engineering knowledge around obligations and claims.

Requirements, standards, policies, security threats, safety hazards, invariants, traceability relations, approvals, and evidence packages describe properties for which merely producing an implementation is insufficient. Someone must be entitled to assert something about the resulting system.

[ref:fig-h-assurance-frontier] The characteristic structure runs from an obligation to an assurance claim.

<!-- label: fig-h-assurance-frontier -->
<!-- figure: assets/h6-assurance-decidable-semantic.svg | *The determinization frontier in assurance.* An obligation, once interpreted into a claim, splits into a decidable part—settled by a checker, proof, validator, or test—and a residual semantic judgment settled by human review or expert decision. Both paths produce evidence supporting the assurance claim. The frontier marks which assurance judgments can responsibly become repeatable and which cannot. -->

Assurance therefore emphasizes Alignment, but it still depends on Modeling. A requirement stated only in prose may require repeated semantic judgment to determine whether a change satisfies it. A more structured representation may expose a predicate that machinery can evaluate. Other obligations remain statistical, semantic, or normative and continue to require human authority.

The determinization frontier is particularly visible here. The goal is not to mechanize compliance indiscriminately. It is to determine which assurance judgments can responsibly become repeatable and which cannot.

Traceability then connects the claim outward. A compliance requirement may trace to a product decision, architectural model, implementation component, test, operational measurement, and ultimately the evidence supplied to an auditor or other authority.

Assurance is consequently cross-cutting rather than merely the last lifecycle stage. An obligation can originate here and constrain discovery, engineering, maintenance, and operation. Conversely, evidence supporting an assurance claim can originate from all four.

**MAGE profile.**

**Characteristic models.** Requirements, policies, threats and hazards, invariants, traceability, assurance cases, claims, and evidence models.

**Lifetime.** Usually system- or organizational-lived, although individual evidence can be change- or execution-scoped.

**Alignment posture.** Strong where claims are decidable; validators, proofs and checkers, evidence gates, and human approvals where appropriate.

**Role of autonomous reasoning.** Interpreting semantic obligations, maintaining traceability, assembling evidence, identifying gaps, and evaluating claims that machinery cannot settle.

**Determinization opportunity.** High for decidable claims; fundamentally limited where interpretation or normative judgment remains necessary.

**Degrees of freedom.** Realization choices irrelevant to the assurance obligation, plus judgments for which no responsible deterministic predicate exists.

**Smallest useful adoption.** Select one consequential obligation, connect it explicitly to the relevant product and engineering artifacts, and automate evidence or admission only to the degree justified by its governability.

**Connects to.** Everything. Assurance is where obligations and evidence can traverse the entire product lifecycle.
