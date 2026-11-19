# Chapter 2: motivate the engineering question before the model

Applied 2026-11-19. Use **context → consequence → engineering question → model → semantics → analysis** as a teaching progression, not a mandatory set of labels. The consequence usually needs one sentence identifying what can go wrong for a user, operator, or engineer. An existing incident can already supply it.

| Location | Treatment |
|---|---|
| §2.3.1 | Context and access-control/consistency consequence, then labeled Question, Figure 2.7, Semantics, and Analysis. Preserve the indirect Web→Cache→Database bypass example. Remove duplicated Question/Semantics/Analysis text inside the figure. |
| §2.4.1 | Scenario and incomplete-result consequence, then Question, four-state transition function, Semantics, and Analysis. Retain implementation freedom. Explain the later retry extension and name mapping before Figure 2.10. The initial property is start-before-finish, not proof that real work is complete. |
| §2.5.1 | Admission/charging stakes and Question precede Table 2.4. Retain the one-entitlement assumption before the table and in its caption. Row-reading Semantics follows the table. The existing boundary-case and consistency analysis remains under Properties and Analyses; do not duplicate it. |
| §2.6.1 | Begin with the slow-service investigation and why separately recorded information obstructs it. Then Question, shared identities, and static model versus execution history; generalize to connections across concerns and levels, followed by stepwise refinement. This is joining existing representations, not constructing another model class. Figure 2.18 remains in §2.6.3. |

## Caption openings

- Figure 2.7: *Structural modeling—layered architecture.*
- Figure 2.10: *Behavioral modeling—job lifecycle and retries.*
- Table 2.4: *Decision modeling—admission by entitlement.* The generic example concerns requested work, so the title does not narrow it to uploads.
- Figure 2.18: *Connecting models—service identity, deployment, and measurements.*

Keep the other specific captions. Do not rename every worked figure to create a superficial naming pattern.

## Chapter-wide application

§§2.1–2.2 introduce model selection and use, rather than three more parallel worked examples. Retain their current structure. Their sensor/buffer inset already begins with a loss question and makes the failure concrete. The later DocAble subsections already motivate unavailable recovered documents, competing owners, lost semantic information, denied entitlements, and model correspondence. Add a consequence only where the reader otherwise cannot tell why the question matters. Do not add a generic sentence about confidence, productivity, or risk to every example.

Keep consequences separate from established results. A declared architecture can identify a bypass; it does not itself enforce access control. A lifecycle can constrain completion ordering without proving task correctness. A decision table can be complete within its stated scope while omitting real entitlements. Joined records can support an investigation without proving a causal diagnosis.

This pass changes introductory exposition, order, four caption titles, and Figure 2.7's repeated explanatory block. It does not apply the separate pending figure-fill revision prompt.


## Analytical repertoire follow-up

- §§2.3.1–2.5.1 now introduce the kinds of questions answered under **Properties and Analyses** before defining individual properties.
- §2.6.1 opens with a three-use table: combine facts, relate representations, compose behavior. These are overlapping analytical uses, not a new model taxonomy. The slow-service investigation, permission derivation, and worker/lease interaction develop them in that order. Existing refinement material follows those examples.
- §2.6.2 starts with the correspondence problem before prescribing common sources; §2.6.3 links its examples to the first two table uses without claiming a demonstrated behavioral composition.
- §2.4.1 adds the LTL response formula with a start-event state marker for one job. Finite executions that cannot continue repeat their last state, covering nonterminal deadlocks as well as completed jobs. Existing timeout and scheduling qualifications remain.

Technical cross-check: [Spin LTL reference](https://spinroot.com/spin/Man/ltl.html) and [Spin execution semantics](https://spinroot.com/spin/Man/Intro.html). The manuscript retains its existing Baier–Katoen reference.


## Conclusions and transitions follow-up

Reviewed both levels of ending: the teaching subsection before each DocAble discussion, and the full section before the next model class.

- §2.3.1 now explicitly closes **structural modeling** and names the two selected DocAble examples. The external/internal modeling aside is archived rather than repeated here.
- §2.3.2 drops the intervening first-model/second-model comparison, preserves its annotation at the substantive closing comparison, and grounds the final generalization in the examples.
- §2.4.1 introduces the two behavioral examples after the statecharts discussion. §2.4.2 distinguishes permitted state changes from criteria for choosing an action.
- §2.5.1 adds the short segue about uncertain evidence, service permissions, and entitlements. Its existing DocAble opening remains. §2.5.2 retains the concrete three-example conclusion and shortens the transition to connected models.
- §2.6.1's correspondence transition remains unchanged, following the later recommendation. §2.6.2 adds a sentence preparing the DocAble examples; §2.6.3 ends with inspecting evidence and detecting disagreements rather than an abstract model-family contrast.

Replaced or removed substantive excerpts are preserved in `cutting-room-floor.md` with source provenance.
