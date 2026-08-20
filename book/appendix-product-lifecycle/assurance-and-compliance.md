**Engineering question.** What must we be able to demonstrate about the product?

Assurance and compliance organize work around claims that must be established, not merely implementations that must be produced. Some claims are naturally evaluated over models; others concern the realized system; many require evidence connecting the two.

A security claim may be evaluated over a data-flow or access-control model; a memory-safety claim concerns the code that executes. Where implementation is not wholly generated from authoritative models, assurance must span both. Proving a property of an access-control model does not establish that the implementation realizes it, while inspecting implementation alone may obscure the intended policy. Traceability and Alignment connect the modeled claim to evidence from its realization and, where necessary, outward to requirements, operational measurements, and other lifecycle evidence.

[ref:fig-h-assurance] separates model evidence, realization evidence, and the traceability needed when a claim depends on both.

<!-- label: fig-h-assurance -->
<!-- figure: assets/h6-assurance-models-realization.svg | *Assurance across models and realization.* Claims may depend on modeled properties, realized properties, or correspondence between the two. Traceability and Alignment connect the required evidence. -->

Assurance creates pressure to reduce degrees of freedom only where the return justifies it. Authoritative models and trustworthy transformations can move assurance toward the governing model and away from independently authored realization, but eliminating freedom costs modeling effort and may make later changes harder. Other properties are cheaper to establish over the realized system. The same tradeoff governs determinization: mechanize claims that can be decided responsibly; leave statistical, semantic, or normative judgment where it belongs.

Agentic realization may also shift verification away from lightweight code review toward more formal inspection.[^fagan] Contemporary review assumes changes arrive slowly enough that peers can reconstruct intent, context, and obligations from diffs, comments, tests, and local judgment. Agent-generated changes stress that assumption. Inspection may therefore become a distinct activity organized around explicit obligations, models, traceability, procedures, and evidence rather than an informal second look at code.

Such inspection could begin from a ticket or assurance claim, traverse to the governing models, inspect their realization where necessary, and judge whether the evidence establishes both correspondence and satisfaction. The analogy to classical software inspection is structural rather than procedural: production and verification separate more clearly as realization becomes cheaper.

Assurance is therefore cross-cutting rather than a final lifecycle stage: its obligations constrain work elsewhere, and its evidence can originate anywhere in the lifecycle.

**MAGE profile.**

- *Characteristic models.* Requirements, policies, threats and hazards, invariants, traceability, assurance cases, claims, and evidence models.
- *Lifetime.* Usually system- or organizational-lived, although individual evidence can be change- or execution-scoped.
- *Alignment posture.* Strong. Assurance may require evidence over models, over their realization, and over the correspondence between them.
- *Role of autonomous reasoning.* Interpreting semantic obligations, reasoning across modeled and realized properties, maintaining traceability, assembling evidence, identifying gaps, and evaluating claims that machinery cannot settle.
- *Determinization opportunity.* High for decidable claims over either models or implementation; limited where interpretation or normative judgment remains necessary.
- *Degrees of freedom.* Realization choices left unconstrained because they are irrelevant to the assurance obligation or cheaper to inspect than to specify in advance.
- *Smallest useful adoption.* Select one consequential obligation, identify what must be established over models and realization, connect those artifacts through traceability, and automate evidence or admission where the claim is decidable.
- *Lifecycle connections.* Assurance carries obligations across the lifecycle and draws evidence from product decisions, engineering models, implementation, change history, and operational behavior.

[^fagan]: Formal software inspection has a substantial history. Michael Fagan's work at IBM distinguished inspection from informal review by treating it as a systematic verification activity with defined roles, procedures, and recorded results. The analogy here is structural rather than procedural: MAGE does not propose restoring the original inspection process, but predicts renewed pressure to formalize inspection as realization becomes cheaper and more abundant. See Fagan 1976 [cite: fagan1976inspections] and Fagan 1986 [cite: fagan1986advances].
