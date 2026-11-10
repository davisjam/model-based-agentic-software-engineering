# Chapter 3: Four callbacks from defined meaning to governance

Implementation-ready copyedit. The author has authorized these changes to land directly; the files here are draft replacements for the root agent to integrate. No manuscript source has been edited by this drafter.

The callbacks do different work: the chapter opening connects the activities; §3.2 distinguishes obligation, evidence, and admission; §3.3 continues the architectural example; the testing passage develops the constructive behavioral example into a richer ownership problem.

## 1. Chapter opening

**Source:** `book/latex/sources/part3/00-part-intro.tex:7`

**Replace from:** “MAGE calls this move Alignment and treats it as the companion to Modeling.”

**Stop before:** `Commodity intelligence makes this longstanding problem newly important.`

**Proposed replacement**

MAGE calls this move Alignment and treats it as the companion to Modeling. In Chapter 2, an architectural relation specified which components may communicate, while a state machine specified how a job should respond to events. Their defined meanings make selected engineering decisions explicit. Alignment connects those decisions to mechanisms in the engineered environment. Constraints restrict actions or states; sensors supply evidence; and gates evaluate evidence and control whether work may proceed. An obligation with no such mechanism may still matter greatly, but satisfying it continues to depend on human or agent judgment at the point of use.

**Why:** Connects both kinds of model meaning to Alignment without re-teaching either example. The three governance functions remain distinct, and the state machine represents intended behavior as well as excluded transitions.

**Native fragment:** `01-chapter-opening.proposed.tex`. Current replacement span preserved in `01-chapter-opening.current.tex`.

## 2. Independent obligation and evidence

**Source:** `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex:17`

**Replace from:** “Enforcement requires two things:”

**Stop before:** `% <!-- point: software-engineering-has-a-traceability-heritage-alignment-builds-on`

**Proposed replacement**

Enforcement requires two things: **an obligation independent of the work being judged and a boundary where the evidence needed to evaluate that obligation is available.** The architectural model requires `Reporting` to obtain billing data through `BillingAPI`, preserving `BillingDB` behind that interface. The job-lifecycle model specifies how events move a job from `IDLE` through `RUNNING` to `DONE` or `FAILED`. These are accounts of intended construction and behavior against which an implementation can be evaluated.

The environment needs evidence that corresponds to those meanings. A dependency analysis can look for direct database access from `Reporting`; a model-based test can submit job events and compare the resulting states with the specified transitions. The engineer must choose where the relevant evidence becomes available and how the finding should affect the work. A check may inform a later decision, or a gate may use its result to refuse an action or candidate. The obligation can also reside directly in a type, permission, schema, test, or policy. What matters is that it is distinguishable from the implementation being judged and that a mechanism can enforce the resulting decision.

**Why:** Uses the two shared examples to separate intended meaning, implementation evidence, and enforcement. Retains the independence and boundary conditions, and preserves obligations carried directly by types, permissions, schemas, tests, or policy. The existing traceability paragraphs now continue from concrete evaluation and admission choices.

**Native fragment:** `02-independent-obligation-and-evidence.proposed.tex`. Current replacement span preserved in `02-independent-obligation-and-evidence.current.tex`.

## 3. Reporting mechanisms

**Source:** `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex:21`

**Replace from:** “Suppose you are adding a reporting service to a billing system.”

**Stop before:** `% <!-- index-def: governance-mechanism -->`

**Proposed replacement**

Return to the billing architecture: `Reporting` may obtain data through `BillingAPI`, but must not connect directly to `BillingDB`. Keeping that boundary lets the billing service control access to its data and change its schema without exposing it to every client. The architectural model states the permitted relationship. How can the engineered environment preserve it while agents change the reporting code?

**Why:** Continues the same architecture instead of introducing it again. Retains the access-control and schema rationale, then asks the question answered by the existing definition, taxonomy table, and worked mechanism example. Existing figures and the rest of the section remain intact.

**Native fragment:** `03-reporting-mechanisms.proposed.tex`. Current replacement span preserved in `03-reporting-mechanisms.current.tex`.

## 4. Tests and models

**Source:** `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex:202`

**Replace from:** “The reporting-service boundary concerns a relationship between components.”

**Stop before:** `We can also state a property covering many such cases:`

**Proposed replacement**

The reporting-service boundary concerns relationships among components. The job-lifecycle state machine supplies a constructive account of behavior: it specifies how a job's state should change in response to events. That meaning can guide implementation and provide expected outcomes for tests. The testing task is to compare those expectations with what the implementation actually does.

Consider a more demanding job protocol in which workers claim queued jobs under expiring leases. Worker A's claim expires, worker B acquires a newer claim, and A then tries to release its old one. A regression test can reproduce that sequence against the implementation and assert that B remains the owner. It preserves a concrete failure scenario and makes a recurrence easier to diagnose. Such tests remain useful as the system acquires more explicit models [existing Winters et al. citation].

**Why:** Recalls the constructive meaning of the lifecycle before extending the problem to lease ownership. Explicitly introduces leases as additional behavior, keeps the stale-release regression and citation, and flows into property-based testing and the later reusable ownership model without implying that the simple lifecycle already contains lease semantics.

**Native fragment:** `04-tests-and-models.proposed.tex`. Current replacement span preserved in `04-tests-and-models.current.tex`.

## Integration and audit notes

- Preserve the existing point directive immediately before each replacement span. The §3.2 fragment also preserves the intervening representation-independence point directive and its stable slug. No index-definition or heading anchor is displaced.
- The native fragments use `\magevalue{chapter:modeling}` for the explicit chapter reference. No literal section number is introduced.
- The unified component labels are `Reporting`, `BillingAPI`, and `BillingDB`; the simple lifecycle states are `IDLE`, `RUNNING`, `DONE`, and `FAILED`.
- The ownership example is explicitly a more demanding protocol. The simple Chapter 2 lifecycle is not claimed to represent workers, lease expiry, generations, or release behavior.
- The existing Winters citation remains before terminal punctuation. There are no new literature claims or citations.
- Meaning makes expected construction or behavior expressible; implementation evidence supports evaluation; a gate controls admission. No sentence treats a report as enforcement or defined semantics as proof of implementation correctness.
- The chapter opening uses one compact taxonomy sentence. The later sites use mechanisms and examples instead of repeatedly restating the taxonomy.
- Both adjacent sections were read with each replacement in place. Traceability follows the §3.2 decision about how findings affect work; the mechanism table follows the architecture question; the existing property-based paragraph follows the stale-release example.
- Preserve the two explicitly untouched subsections, figures, and all downstream testing distinctions. No new diagram is warranted: Chapter 2 supplies the meanings and the existing Chapter 3 figures teach their use.

Approximate whitespace word counts (TeX comments and citations removed):

| Replacement | Current | Proposed |
|---|---:|---:|
| 1 | 72 | 97 |
| 2 | 121 | 182 |
| 3 | 75 | 60 |
| 4 | 124 | 129 |
| Total | 392 | 468 |

The attached brief’s 200–250-word estimate understates its four complete replacement spans. This version develops the requested connections in sustained paragraphs while adding only the words needed for the two examples and the evidence/admission distinction.
