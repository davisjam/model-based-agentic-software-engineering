<!-- GENERATED from book/latex/sources/appendix-handbook/controlled-mutation.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

A repairer may know that a document needs better alternative text without being entitled to change every part of its internal structure. Giving each producer unrestricted write access also makes it difficult to preserve the same restrictions, attribution, and failure behavior as reasoning strategies change. The engineering need is a common application boundary: producers express supported changes, and the machinery that performs them can resolve targets, refuse selected requests, and report what occurred.

[ref:handbook-typed-changeset] follows one proposal through that boundary. The arrangement permits flexible reasoning about what to change while concentrating supported mutations in a controlled writer. It also shows what the interface does not cover: some internal DocAble remediation still edits directly, and semantic adequacy remains an obligation beyond successful application.

<!-- label: handbook-typed-changeset -->
<!-- figure: assets/handbook-typed-changeset.svg | *Controlled mutation separates a proposed edit from its effects.* Supported operations resolve targets against current state and pass selected guards before mutation. Per-operation results include refusals; successful session operations and remediation-pass mutations use distinct attribution channels. Before-value comparison is advisory by default, and unmigrated internal edits remain outside this route. [short: Controlled mutation] -->

## Separate the Proposal, the Writer, and the Record {#handbook-model-document-changeset}

The document model supplies a typed view of the artifact. An operation names a supported mutation, a target in that view, and the required payload. An ordered changeset collects operations before application. These are proposals: neither the producer’s confidence nor the presence of an operation in the list establishes that it was applied. The applier returns per-operation results so that refused or failed requests remain distinguishable from changes that occurred.

This excerpt from DocAble’s `EditOp.cs` shows a replacement-description operation; optional fields are omitted. A structural identifier replaces a raw byte address, and the before- and after-values make the intended transition inspectable.

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

DocAble’s shared applier operates on an already-open PDF document. The caller owns opening and closing the file; browser editing and migrated remediation passes can reuse the in-memory application engine without a file round-trip for every pass. After a successful tree mutation, the implementation rebuilds its structure reader before subsequent operations use the changed structure. Target resolution and indexing are therefore part of the writer’s contract, not details every reasoning producer should reproduce.

Attribution has two channels. A migrated remediation pass supplies its own pass name to the mutator-stamp machinery. An editor session instead uses a session operation log. The session log receives an entry only for a successfully applied operation when a session identifier is present; failed requests remain visible in operation results, not as applied-edit entries. A batch pass supplies no session identifier and does not thereby become an editor session. A history consumer must know which record it is reading and must not count the producer’s entire proposal as a history of mutations.

## Decide Which Conditions Refuse an Edit {#handbook-model-accessibility-policy}

Resolving a current target creates an opportunity to enforce obligations that the producer’s text alone cannot settle. Consider a request to demote a PDF structure to a decorative artifact. In DocAble, the request must identify the source of the decorative verdict. The applier refuses missing verdict evidence, an unresolved target, and structurally informative content such as a heading, a formula, or an element carrying authored alternative or replacement text. These refusals occur before the requested demotion. A mutator’s own conservative decline is also returned as a per-operation failure rather than silently disappearing from the result.

The policy for interpreting uncertain evidence is a separate component. DocAble’s decorative-confidence vocabulary distinguishes clearly decorative, uncertain, and informational results; only the clearly decorative result permits its internal decorative flag. An absent or unrecognized answer does not become permission to suppress content. That authored policy guides the use of a vision-language model’s judgment, while the applier supplies selected structural refusals. Neither mechanism establishes every image’s instructional importance. An apparently admissible operation may still need semantic evaluation.

A before-value field requires another explicit policy. The inspected PDF pass runner offers three modes:

<!-- print-keep-with-next: 11 -->

``` text
public enum PdfBeforeGateMode
{
    Off,
    Audit,
    FailLoud,
}
```

`Off` omits the comparison. `Audit`, the default argument on the inspected runner, compares supported before-values with current state, records mismatches, and applies the operations anyway; other operation kinds remain explicitly unchecked. The enum also names `FailLoud`, but in the inspected runner this changes the diagnostic wording: mismatches are returned and application still proceeds. Refusal requires a consumer that actually stops the operation on those findings. For another system, implement and test that path before relying on the comparison to prevent stale writes.

## Construct and Migrate One Operation at a Time

Start with a consequential operation whose target and intended effect can be stated precisely. Define the operation vocabulary, the information needed to resolve its target, and a result that distinguishes success from refusal and failure. Keep the proposal serializable if it must cross a process boundary or be inspected before execution. Then implement the complete path for that operation: resolve current state, evaluate its guards, perform the mutation, and emit the evidence required by its consumers.

Choose the comparison policy from the actual concurrency and failure model. A single-writer batch and a delayed proposal applied after another writer’s changes have different hazards. Specify whether a stale target or before-value causes observation, rejection, retry, or engineering review. Preserve the difference between a refusal made before mutation and an operation that failed after attempting work, including any partial effects the target system permits.

Migrate a producer only after naming the behavior that must remain stable. A structured pipeline, a general-purpose agent, or a human editor can propose the same operation vocabulary, but substituting their reasoning is a separate empirical comparison. During interface migration, check the resulting artifact, refusal behavior, attribution identity, and any consumers that classify the producer’s mutation path. Record which producers remain direct writers so that the controlled interface’s coverage is explicit.

A November 8 DocAble port illustrates why this is necessary. Moving an alternative-text validation pass behind the runner would have added pass-attribution records absent from its previous output, violating the assignment’s byte-identity criterion even if the intended text mutation stayed the same. Registry indirection also prevented the existing code-parity detector from recognizing the proposed route. The attempt stopped with a documented finding; no production port or model reclassification was claimed. An engineer continuing that work would need to decide whether the new attribution is an authorized behavior change and make the detector capable of evaluating the chosen implementation.

## Verify the Boundary and Its Coverage

Exercise refusal paths with a known starting artifact. A missing verdict source, a protected heading, and an unresolved target should produce the expected failure without the prohibited mutation. A supported successful edit should produce both its result and the appropriate attribution. A failed session operation should not acquire a successful-session log entry. A tree-changing operation followed by another targeted operation should use the updated structure. Check these effects on the artifact and records rather than accepting the producer’s report that the guard ran.

Coverage requires a declared population. DocAble’s stamp-wiring lint inspects selected production primitive directories, discovers public static methods with mutation-name prefixes, and looks for recognized stamp calls or a justified exemption. Its documented extraction heuristic skips a method whose body it cannot reliably extract. Test code is outside that scan. A clean result therefore concerns the enumerated methods and recognized wiring; it is not proof that every possible mutation in the product emits accurate provenance.

The model projection and lint share their classification predicate. This prevents inconsistent classifications from two implementations of the same rule, but it does not independently establish that the rule discovers every relevant operation. When adding a new mutation pattern, test that the scanner includes it, that removing its stamp produces a finding, and that exemptions remain visible. The blocked port shows why updating the producer alone may leave the checking machinery unable to describe the new architecture.

Finally, evaluate the document properties the interface cannot decide. Content preservation and mechanically testable accessibility conditions require evidence about the resulting artifact. The semantic quality of an alternative description may need a different evaluator or human review. A supported operation is permission to attempt a particular kind of change, not proof that the chosen change is correct.

## Adapt the Mutation Vocabulary

The same arrangement can govern a configuration change, a database update, or an edit to another structured artifact. Choose domain operations that preserve the distinctions needed at the boundary; a generic “run arbitrary code” operation would hand those distinctions back to the producer. Keep the vocabulary small enough to maintain but expressive enough for legitimate work. Extend it when repeated unsupported requests reveal a useful operation, and test each addition against the result, attribution, and compatibility contracts already relied upon.
