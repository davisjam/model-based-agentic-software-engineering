# Rule-metadata registry (machine-readable metadata on governance rules)

**Intent** — Attach **machine-readable metadata** to each rule in a governance document — its identifier,
scope, severity, the enforcing check, the canonical detail location — as a structured block inside the
rule, then extract those blocks into a typed registry the tooling can query. A body of governance prose
stops being an opaque wall a program can only grep and becomes a model: "which rules have an enforcing
lint?", "which rules govern the PDF subtree?" are queries over a registry, not manual reads (our instance:
inline metadata blocks on the numbered project rules, extracted into a typed rule registry).

| | |
|---|---|
| Summary | Machine-readable metadata on each governance rule, extracted into a typed, queryable registry. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — each rule's metadata block is structured and extractable, and the derived registry is reconciled against the document so a rule without a well-formed block, or a block citing a missing enforcer, is a build finding |
| Derivation | `model-from-code` — the registry is extracted from the inline metadata blocks in the governance document |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A mature governance document accretes dozens of rules, and the interesting questions about them are
**aggregate**: which rules are backed by an automated check and which rely on review, which apply to a
given subtree, which are advisory versus blocking, which have a canonical detail doc and which are
orphaned prose. As long as the rules are only human paragraphs, every such question is a manual read of the
whole document, done from memory, and the answer rots as the document grows. Nobody can mechanically tell
that a rule *claims* an enforcing lint that no longer exists, or that a rule's scope is stated one way in
its text and enforced another way in a check. The document is a program's-worth of policy that no program
can see into, so its consistency is maintained by attention alone — and attention does not scale with the
rule count.

## Why it's not just the rules written in prose

Prose rules are readable by a human and opaque to a tool; the metadata block is the bridge. A rule that
carries a structured block — identifier, scope, severity, enforcer, detail pointer — can be **extracted,
queried, and cross-checked**, and the extraction turns the whole document into a registry a program walks.
The block is not a summary of the prose; it is *typed fields the prose cannot be reduced to by parsing*.
"This rule is blocking, scoped to the PDF subtree, enforced by check X, detailed at doc Y" is a fact a
grep over English cannot reliably recover, and a fact the registry makes first-class. Once extracted, the
registry supports checks prose never could: a rule citing an enforcer that doesn't exist is a build
finding, a rule with no detail pointer is flagged, the count of rules-with-automated-enforcement is a
computed number. The prose stays for the human; the block gives the tooling the same rules as a model.

## Mechanism

- **Each rule carries a structured metadata block.** Inside or beside the human rule text sits a
  machine-readable block: a stable identifier, the rule's scope, its severity, the check that enforces it,
  and where its full detail lives.
- **Extract the blocks into a typed registry.** A build step reads every block and materializes a registry
  of typed rule records, so the governance document projects into a queryable model.
- **Query the registry instead of grepping the prose.** "Which rules have an automated enforcer?", "which
  govern this subtree?", "which are blocking?" are answered by walking the registry, not by re-reading the
  document.
- **Cross-check the metadata against reality.** A rule whose block cites an enforcing check that doesn't
  exist, or whose detail pointer dangles, is a build finding, so the metadata cannot claim enforcement the
  system doesn't have.
- **Keep the block and the prose in one place.** The metadata lives with the rule it describes, so a rule
  edited without updating its block, or a block with no rule, is caught rather than drifting into a
  separate index that disagrees with the text.

## Prerequisites

- **A governance document with enumerable rules.** The registry extracts per-rule metadata, so the rules
  must be discrete and identifiable, not a continuous essay.
- **A stable identifier per rule.** The metadata records key off an identifier the rest of the system can
  cite; without stable ids the registry cannot be joined to enforcers or referenced elsewhere.
- **An extraction and reconciliation step.** The value depends on the blocks actually being parsed into a
  registry and checked against the document and the enforcers, not hand-maintained alongside them.

## Consequences & costs

- **Governance becomes queryable.** Aggregate questions about the rules — enforcement coverage, scope,
  severity — are computed over the registry, so the document's consistency is checked rather than
  remembered.
- **Every rule now owes a well-formed block.** Adding a rule means authoring its metadata; the
  reconciliation gate is what makes the block mandatory instead of optional, and an unstructured rule is a
  finding.
- **The metadata must not drift from the prose.** A block that says "enforced by X" after X was removed is
  worse than no block, because it asserts a guarantee that's gone; the cross-check against real enforcers is
  what keeps the claim honest.

## Known uses

- Inline metadata blocks on a set of numbered project rules, each carrying the rule's identifier, scope,
  severity, enforcing check, and canonical detail pointer.
- A build step that extracts the blocks into a typed rule registry, so tooling can ask which rules have an
  automated enforcer and which rely on review.
- A cross-check that flags a rule citing an enforcer that no longer exists or a detail pointer that
  dangles, so the governance document's claims stay reconciled with the system that enforces them.

## Related mechanisms

- **Counterpart** — [claude-md-rule-index](../../agent/governance-doc-controls/claude-md-rule-index.md): that mechanism governs the governance
  *document* itself — its cap and index discipline on the human prose; this one extracts the machine-readable
  *metadata* out of the rules into a queryable model. The document-side control and its model-side twin.
- **Sibling** — [domain-registries](domain-registries.md): both turn an enumerable set of facts into a
  typed registry the tooling reads; that one over domain values, this one over governance rules.
- **Consumer** — [query-surface](query-surface.md): the extracted rule registry is one more model the query
  surface exposes, so "which rules enforce X" joins the other model queries.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the reconciliation that keeps the extracted
  registry equal to the document's rules and their real enforcers.
