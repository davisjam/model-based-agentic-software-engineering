# Cutting room floor

Substantive passages removed or deferred during MAGE book editing are preserved here for later author review. Their destination is undecided; setting them aside does not establish that they are incorrect or authorize inserting them elsewhere. This editorial file is outside the published manuscript.

Append future cuts to this same file before changing the manuscript. Record the source path, section, source revision and line range, removal date and revision when known, and reason for setting the passage aside. Preserve the original wording, citations, references, and qualifications. If material is later reused or discarded, record that decision alongside its entry.

## Preface cuts from 30 October 2026

- Source: `book/latex/sources/frontmatter/0.5-preface.tex`
- Source revision before editing: `6f9e6faa477c3712ad85b40671e3db6b66c37855`
- Removal revision: `5dfad34bee7049f9bf9c43e7cf9f28d4e61c3a4b`
- Status: set aside for later review; destination undecided.

### The MAGE Method

Provenance: source lines 122–126 at the revision above.

Reason: The Preface should introduce how Modeling and Alignment work together. The discussion of Alignment without explicit models, and the defense of Modeling as a methodological rather than logical prerequisite, was too subordinate for that introduction.

Excerpt scope: Three original paragraphs, replaced by one short bridge into the method cycle.

```latex
They solve different problems but interact. Alignment always assumes something about what an acceptable result looks like: what must hold, and sometimes what variation remains acceptable. That understanding may remain tacit or be encoded locally rather than written down as a model. A sandbox can forbid an action using a local rule rather than a separate system model; a test can block a regression by encoding expected behavior; a human reviewer can judge an obligation that no machine-readable model yet captures. But they have a limit: they can govern only what the environment can state, observe, or ask a person to reconstruct.

Modeling changes that boundary. By making consequential relationships explicit---structural, policy, behavioral, ownership, measurement, and others---Modeling lets humans, agents, and tools reason over them directly and apply analyses suited to those representations. Where those properties express obligations, Alignment can enforce them through governance mechanisms that consume the available evidence.

MAGE therefore places Modeling first as a methodological choice rather than a logical prerequisite. Relevant knowledge and intent may already be tacit or encoded locally; Modeling makes explicit only what is worth externalizing; it need not eliminate realization choices that engineering has reason to leave open. The method asks the engineer to externalize the abstractions that matter before repeatedly spending human attention on what the environment cannot see. Once those properties are explicit, some judgments that once required reconstruction can be handled by repeatable machinery.
```

### The new bottleneck

Provenance: source line 87 at the revision above.

Reason: Removed the early qualification about tests, sandboxes, types, and gates enforcing obligations without a separately represented model. The revised paragraph stays with the problem of reconstructing missing knowledge.

Excerpt scope: Original paragraph retained in full for context; much of its surrounding explanation remains in the Preface.

```latex
A fleet can generate, inspect, and modify implementation much faster than a human team. But more implementation capacity does not automatically produce more system-level understanding or better engineering judgment. When the necessary knowledge remains implicit, the fleet repeatedly reconstructs it. When an obligation is locally checkable, a test, sandbox, type, or gate may enforce it without a separately represented model. But when the obligation depends on architecture, ownership, end-to-end behavior, or another model the environment lacks, somebody must supply the missing meaning. In many organizations that somebody is still a human reviewer. The result can work, but the human sits in the gap between what the environment can check and what the system actually needs guaranteed.
```

### Evidence and scope

Provenance: source line 107 at the revision above.

Reason: Set aside the comparison between systems relying more heavily on explicit models and systems relying more heavily on controls and human judgment. The Preface now describes the variation in organizational choices without developing that distinction.

Excerpt scope: Original paragraph retained in full for context; the two-source evidence account remains in the Preface.

```latex
MAGE draws on two kinds of evidence. The first is a single longitudinal case: one production system, built by one engineer using one vendor\textquotesingle s agent ecosystem over several months and used in production by me and my colleagues at Purdue. Numbers from that case are observations, not measured laws. The second is a set of reconstructions based on independent industrial accounts. Those accounts show less of how each system evolved, but more variation in technical and organizational choices, including systems that rely more heavily on explicit models and systems that rely more heavily on controls and human judgment. \magevalue{chapter:software-factories} presents both sources, states their limits, and ties empirical claims to supporting data or citations.
```

## Chapter 1 delegation passage from 30 October 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, opening discussion of implementation and delegation.
- Source revision before editing: `1f31538eb41fdb0aac202e8fda6f3df10581545e`
- Source line: 30.
- Removal date: 2026-10-30.
- Removal revision: the commit introducing this archive entry and the approved replacement paragraph.
- Status: set aside for later review; destination undecided.

Reason: Replaced with the author's approved explanation of delegating judgment as an opportunity rather than a requirement. Responsibility and engineering control remain established in the Preface and surrounding discussion.

Excerpt scope: The complete original paragraph, preserved before replacement.

```latex
Engineers can delegate increasing amounts of implementation while remaining responsible for the resulting system. The engineering problem is not how to keep humans performing work that machines can perform. It is how to delegate that work without surrendering the control required to understand, direct, evaluate, and change the resulting system.
```
