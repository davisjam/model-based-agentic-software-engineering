# Chapter 2 focused additions — draft only

No shared manuscript, generated projection, metadata, figure, bibliography, or Git changes made. Read both supplied semantic-meaning attachments, the follow-up Chapter 3 attachment, the actual §2.1 receiving context, §2.3 behavioral text, its `canonical-behavioral` TikZ source, and the reporting-service continuation in §3.3. Applied self-communicate in engineering-textbook explanation mode.

## 1. Defined meaning insertion

File: `defined-meaning.tex` (approximately 680 words of reader-facing prose and notation, plus editorial metadata).

Authoritative receiving file:
`book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`.

Insert after the complete paragraph under the stable point `semantic-precision-is-not-generative-completeness`, which ends:

> The engineering question is which decisions the engineer has made explicit and which decisions the implementer remains authorized to make.

Insert before the entire metadata block introducing the Tools inset:

```tex
% <!-- box-family: inset -->
% <!-- inset-domain: AGENT HARNESS -->
% <!-- box-weight: aside -->
% mage-box-prefix: Inset —
\begin{bookbox}{inset}{Tools}
```

Keep every surrounding paragraph unchanged. The draft uses native `\subsection`, making “Giving a Model Defined Meaning” a child of the existing “Structure and Semantics Make Representations Machine-Operable” treatment. This matches the existing use of nested `\subsection` within §2.1; it does not create another numbered chapter unit. Root can adjust this depth if the rendered hierarchy warrants it.

The flow becomes: semantic-commitment spectrum and interpretation burden → difference between precise meaning and program completeness → two worked interpretations → Tools exposing knowledge/capability → existing structured-graph discussion. The examples give the Tools inset concrete representations to operate over without reproducing its tools argument.

### Technical choices and reconciliation

- Unify the architecture literally with Chapter 3: Reporting → BillingAPI → BillingDB. The opening spells out the reporting service, billing API, and billing database. The subsequent Chapter 3 callback can accurately say it is returning to the same example.
- Define `Calls` as a **normative permitted-direct-invocation relation** within a declared architectural scope. This differs deliberately from an observed-call relation. The draft explicitly chooses a complete permission set within that scope, so an omitted pair excludes a direct call only **by this specification**, never because an observer failed to see it. This resolves the supplied copy’s shift between “can invoke,” “intended architecture,” and observations.
- Typing establishes endpoint domains; it does not determine whether the relation means observation, permission, or another dependency. The worked definition supplies that missing interpretation.
- State the direct-edge prohibition and the stronger path property. With exactly the three drawn vertices, there is no extra indirect bypass. To demonstrate why the path property is stronger in larger systems, the draft briefly adds Helper as a counterexample route. `C` is defined to **include** the named components, rather than fixed to exactly three, so this explanation is coherent.
- The vertex-removal reachability observation evaluates the path property over the specified graph. It does not claim that an implementation or runtime has already been analyzed, nor that code conformance has been established.
- Reuse precisely the lifecycle already in §2.3 and its figure: IDLE → RUNNING via start; RUNNING → DONE via finish; RUNNING → FAILED via fail. DONE and FAILED are terminal in this small lifecycle.
- Explicitly define a **partial** transition function over the four states and three events. Undefined state–event pairs admit no lifecycle transition; no silently assumed default self-loop or invented successor is introduced.
- Explain constructive use through a state-machine interpreter and generated event-sequence tests with expected terminal states. Leave source-time implementation enforcement, state-space exploration, safety, liveness, and ownership/lease recovery to their existing treatments.
- Preserve implementation freedom through the database/queue/in-memory alternatives. The lifecycle determines observable status behavior, not a storage architecture.
- Finish with the distinction between defined meaning and implementation conformance, pointing to the existing behavioral discussion and Chapter 3. No Chapter 3 text is changed by this task.

### Citations and metadata

Uses only existing keys: `omg2017uml`, `omg2025sysml`, `omg2025kerml`. Their order follows the current semantic-spectrum discussion. Standard mathematical graph/state definitions are developed explicitly; no new literature claim or citation entry is introduced.

Stable heading proposed: `heading:giving-a-model-defined-meaning`.
New point IDs proposed:
- `defined-relations-make-architectural-questions-precise`
- `transition-semantics-can-construct-intended-behavior`

Section terms use existing vocabulary: `semantic-commitment`, `model-as-map`, `modeling-principle`. No new glossary term or index-def is needed. Root should regenerate headings/projections/chapter-shape anchors after insertion. `\autoref{canonical-behavioral}` deliberately avoids a fixed figure number.

## 2. Repertoire inset addition

File: `repertoire-addition.tex` (approximately 95 words of reader-facing prose).

Inside `\begin{bookbox}{inset}{Reuse the engineering repertoire}`, insert immediately after the sorting-analogy paragraph ending:

> Recognizing when that is true, and devising the new abstraction, is precisely the kind of judgment for which engineers are valuable.

Before:

> In the MAGE methodology, engineers decide when to make that knowledge explicit in the agent's environment.

The paragraph uses conditional familiarity with established techniques. It does not claim that commercial corpora contain particular textbooks or that an LLM knows the semantics of every notation. It adds the distinction between general technique familiarity and the engineer’s system-specific purpose, interpretations, and obligations. Research agent confirmed that existing verified sources support learned programming capability but not universal knowledge of the modeling repertoire; conditional wording is appropriate. The opening training sentence is narrowly supported by `chen2021codex` and `gunasekar2023textbooks`; it makes no assertion about undisclosed commercial corpora. The subsequent familiarity-with-modeling claim remains conditional. Root owns the verified new bibliography entry.

## Audit and scope check

Verdict: These additions supply the concrete teaching step missing from §2.1 while preserving the existing chapter division of labor.

Keep: the normative/observed-relation distinction; a concrete indirect bypass; constructive transition effects; interpreter and generated-test uses. The existing longer treatment of behavioral analysis still performs different explanatory work.

No source changes or commits. Checked balanced TeX braces and inline/display-math delimiters in the drafts; no repository tests run. Root should inspect the mathematics and paragraph breaks in the rendered proof, particularly the long path expression and the state-set display. There is no requested new figure: existing `canonical-behavioral` already illustrates the lifecycle later, and the small structural graph is intelligible from its explicit relation and examples.
