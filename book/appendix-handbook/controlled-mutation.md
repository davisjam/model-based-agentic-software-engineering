<!-- GENERATED from book/latex/sources/appendix-handbook/controlled-mutation.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A repairer may know that a document needs better alternative text without being entitled to change every part of its internal structure. Giving each producer unrestricted write access also makes it difficult to preserve the same restrictions, attribution, and failure behavior as reasoning strategies change. The engineering need is a common application boundary: producers express supported changes, and the machinery that performs them can resolve targets, refuse selected requests, and report what occurred.

## Conceptual Design

[ref:handbook-typed-changeset] follows one proposal through that boundary. The arrangement permits flexible reasoning about what to change while concentrating supported mutations in a controlled writer. The governed artifact must be writable only through the intended boundary for those restrictions to hold. Semantic adequacy remains an obligation beyond successful application.

<!-- label: handbook-typed-changeset -->
<!-- figure: assets/handbook-typed-changeset.svg | *Controlled mutation separates a proposed edit from its effects.* Supported operations resolve targets against current state and pass selected guards before mutation. Per-operation results include refusals; successful session operations and remediation-pass mutations use distinct attribution channels. A comparison affects admission only when its consumer refuses the prohibited edit; any direct write path lies outside this boundary. [short: Controlled mutation] -->

Suppose a reasoning component determines that an image needs alternative text. It proposes a typed operation naming the image’s structure element and the intended description. The applier resolves that target against the current document, checks the operation against its supported vocabulary and applicable guards, and performs the mutation if those checks permit it. The result records application, refusal, or failure. Subsequent validation evaluates properties of the changed document. The proposal, applied operation, and validation result are different artifacts: each establishes something the others cannot.

## Engineering Models {#handbook-model-document-changeset}

The operation boundary depends on the four models in [ref:handbook-mutation-models].

<!-- label: handbook-mutation-models -->
<!-- table: *Engineering models for controlled mutation.* Structural identities connect proposed operations to current document entities. Policy determines admissibility, while operation results and attribution records describe the effects that occurred. [short: Engineering models for controlled mutation] -->
| **Model** | **Engineering question** | **Representation** | **Relationships / consumers** |
|---|---|---|---|
| Document structure | Which entities and relationships can an operation target? | Typed document nodes, structural identities, and current relationships. | The applier resolves operation targets against this view; structure-changing edits require refreshed correspondence. |
| Mutation operations | Which effects may a producer propose? | Closed operation kinds, target references, required arguments, before- and after-values. | A changeset orders proposals; the applier interprets each operation against current state. |
| Admissibility policy | When may a proposed operation proceed? | Authored guards, evidence requirements, and rules for uncertain or stale inputs. | Guards and admission decisions consume the policy; diagnostic findings alone do not refuse work. |
| Mutation evidence | What was attempted and what actually changed? | Operation results, pass attribution, and successful-session edit records. | Review and recovery join records to operation, producer, session, and artifact identities. |

The document model supplies a typed view of the artifact. An operation names a supported mutation, a target in that view, and the required payload. An ordered changeset collects operations before application. These are proposals: neither the producer’s confidence nor the presence of an operation in the list establishes that it was applied. The applier returns per-operation results so that refused or failed requests remain distinguishable from changes that occurred.

This excerpt shows DocAble’s replacement-description operation; optional fields are omitted. A structural identifier replaces a raw byte address, and the before- and after-values make the intended transition inspectable.

<!-- print-keep-with-next: 13 -->

``` text
public sealed class SetAltOp : EditOp
{
    public override string WireKind => "set-alt-text";
    public string StructId { get; init; } = "";
    public string BeforeAlt { get; init; } = "";
    public string AfterAlt { get; init; } = "";
    // Optional fields omitted.
}
```

The document structure describes the current artifact; the operation model specifies permitted kinds of change. `StructId` must resolve to the intended current entity. `BeforeAlt` describes the expected prior value, while `AfterAlt` states the proposed result. If another writer changes the artifact before application, the correspondence between reference, before-value, and current state must be reconsidered. The policy determines the response to that disagreement.

The operation vocabulary defines the effects a producer may propose through this interface; it does not establish the correctness of the repair decision. Engineers specify the operation meanings and admissibility rules; the applier enforces the restrictions implemented at its boundary. Operation results and attribution records describe what occurred. They do not authorize the proposed change or establish that the resulting document is semantically correct.

## Realization

### Resolve, Apply, and Record {.unnumbered}

DocAble’s shared applier operates on an already-open PDF document. The caller owns opening and closing the file; browser editing and migrated remediation passes can reuse the in-memory application engine without a file round-trip for every pass. After a successful tree mutation, the implementation rebuilds its structure reader before subsequent operations use the changed structure. Target resolution and indexing are therefore part of the writer’s contract, not details every reasoning producer should reproduce.

Attribution has two channels. A migrated remediation pass supplies its own pass name to the mutator-stamp machinery. An editor session instead uses a session operation log. The session log receives an entry only for a successfully applied operation when a session identifier is present; failed requests remain visible in operation results, not as applied-edit entries. A batch pass supplies no session identifier and does not thereby become an editor session. A history consumer must know which record it is reading and must not count the producer’s entire proposal as a history of mutations.

### Enforce Admissibility {#handbook-model-accessibility-policy .unnumbered}

Resolving a current target creates an opportunity to enforce obligations that the producer’s text alone cannot settle. Consider a request to demote a PDF structure to a decorative artifact. In DocAble, the request must identify the source of the decorative verdict. The applier refuses missing verdict evidence, an unresolved target, and structurally informative content such as a heading, a formula, or an element carrying authored alternative or replacement text. These refusals occur before the requested demotion. A mutator’s own conservative decline is also returned as a per-operation failure rather than silently disappearing from the result.

The policy for interpreting uncertain evidence is a separate component. DocAble’s decorative-confidence vocabulary distinguishes clearly decorative, uncertain, and informational results; only the clearly decorative result permits its internal decorative flag. An absent or unrecognized answer does not become permission to suppress content. That authored policy guides the use of a vision-language model’s judgment, while the applier supplies selected structural refusals. Neither mechanism establishes every image’s instructional importance. An apparently admissible operation may still need semantic evaluation.

A before-value field requires an explicit interpretation policy. A mismatch shows that the proposal’s expected prior value differs from current state. Observation, refusal, retry, and engineering review are different possible responses. In DocAble’s mismatch example, a diagnostic mode reports the disagreement while allowing application to continue. The diagnostic therefore does not enforce the expected prior value. A test of this boundary must examine whether the prohibited operation actually stops, not merely whether the mismatch is reported.

### Construct One Complete Operation {.unnumbered}

Start with a consequential operation whose target and intended effect can be stated precisely. Define the operation vocabulary, the information needed to resolve its target, and a result that distinguishes success from refusal and failure. Keep the proposal serializable if it must cross a process boundary or be inspected before execution. Then implement the complete path for that operation: resolve current state, evaluate its guards, perform the mutation, and emit the evidence required by its consumers.

Choose the comparison policy from the actual concurrency and failure model. A single-writer batch and a delayed proposal applied after another writer’s changes have different hazards. Specify whether a stale target or before-value causes observation, rejection, retry, or engineering review. Preserve the difference between a refusal made before mutation and an operation that failed after attempting work, including any partial effects the target system permits.

Migrate a producer only after naming the behavior that must remain stable. A structured pipeline, a general-purpose agent, or a human editor can propose the same operation vocabulary, but substituting their reasoning is a separate empirical comparison. During interface migration, check the resulting artifact, refusal behavior, attribution identity, and any consumers that classify the producer’s mutation path. Identify any direct write paths when assessing the boundary’s coverage.

A DocAble migration exposes an unexpected compatibility obligation. Moving an alternative-text validation pass behind the common runner would introduce attribution records absent from its previous output and violate the requirement to preserve byte-identical results. The existing route checker also fails to recognize the proposed registry-based path. The migration therefore requires separate decisions about acceptable output changes and the coverage of the checking machinery.

### Verify the Arrangement {.unnumbered}

Exercise refusal paths with a known starting artifact. A missing verdict source, a protected heading, and an unresolved target should produce the expected failure without the prohibited mutation. A supported successful edit should produce both its result and the appropriate attribution. A failed session operation should not acquire a successful-session log entry. A tree-changing operation followed by another targeted operation should use the updated structure. Check these effects on the artifact and records rather than accepting the producer’s report that the guard ran.

Coverage requires a declared population. DocAble’s stamp-wiring check inspects selected mutation methods and verifies that recognized paths carry attribution or an explicit exemption. Some methods are checked with blocking findings; others remain advisory, and paths outside the scanner’s recognized population are not covered. A clean result therefore establishes correspondence only for the methods and patterns inspected, not that every mutation produces accurate provenance.

The model projection and lint share their classification predicate. This prevents inconsistent classifications from two implementations of the same rule, but it does not independently establish that the rule discovers every relevant operation. When adding a new mutation pattern, test that the scanner includes it, that removing its stamp produces a finding, and that exemptions remain visible. The attribution example shows why updating the producer alone may leave the checking machinery unable to describe the new architecture.

Finally, evaluate the document properties the interface cannot decide. Content preservation and mechanically testable accessibility conditions require evidence about the resulting artifact. The semantic quality of an alternative description may need a different evaluator or human review. A supported operation is permission to attempt a particular kind of change, not proof that the chosen change is correct.

## Adaptation and Limits

The same arrangement can govern a configuration change, a database update, or an edit to another structured artifact. Its operation vocabulary must preserve the distinctions needed at the boundary; a generic “run arbitrary code” operation gives that authority back to the producer. A small vocabulary is easier to maintain, but it must remain expressive enough for legitimate work. Repeated unsupported requests can identify useful extensions. Each addition must preserve existing consumers’ result, attribution, and compatibility contracts.
