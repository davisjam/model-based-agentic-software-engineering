# Docs hierarchy + governance index

**Intent** — Give every agent a single, numbered, cross-referenced **rule index** (loaded into its
boot context) that points at the canonical deep doc for each rule, so the fleet shares one authoritative
map instead of re-deriving invariants from scattered files.

| | |
|---|---|
| Summary | One enforced, numbered rule index every agent boots with. |
| Target | Agent · **Context & dispatch substrate** |
| Form | `validation` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the index *content* is advisory to the agent (soft, booted into every context); its cap + conformance lints are *blocking* (the hard counterpart) |

*Its place in the environment — **merged into Governed Knowledge Base** (the boot-context lens; two lenses on one artifact), under **GOVERN · Govern the control machinery itself**. See the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern).*

## Motivation — the failure it kills

In a large codebase, the knowledge an agent needs to not-break-things is spread across hundreds of
docs. Left to discover that knowledge on its own, an agent re-derives an invariant (badly), or
violates a cross-file rule it never found. The failure recurs every time the doc corpus grows: more
documentation makes any *single* fact *less* findable, not more. Without a canonical index, "the docs
say so" is unfalsifiable and unenforceable; there is no agreed place the rule lives.

## Why it's not just "we have a docs folder"

A docs folder is a **pile**; this is an **index with two enforced properties**. First, it is *loaded
into every agent's boot context*: it is the minimum shared world-model, not optional reference an
agent might browse. Second, it is **enforced**: a bloat/cap lint keeps it scannable and a
conformance lint keeps every rule cross-referencing exactly one canonical doc, so the index cannot rot
into a second pile. What does a docs folder lack that this has? Canonicality and enforcement: one
place each rule lives, one place each rule points, and a lint that fails the moment that stops being true.
(The complementary *dispatch-time* move, pushing the subset of rules relevant to *this* change into
the brief, is [dynamic-context-injection](dynamic-context-injection.md); this mechanism supplies the
map, that one delivers the relevant page.)

## Mechanism

`CLAUDE.md` is a stable-numbered rule index: each rule is a short boot-context statement plus a
cross-reference to the canonical doc that carries it in full ("CLAUDE.md carries the rule index; the
sub-doc carries the principle"). The repository documentation index gives a one-line summary per doc. Rule numbers are
*stable, never renumbered*; they are cited by number across the codebase, so the index doubles as a
citable namespace. The index self-describes what belongs in it (a three-part earns-its-spot test) so
it does not accrete local rules that should be doc-comments.

## Prerequisites

- A **discipline that every rule cross-references a canonical deep doc**: the index carries the
  minimum, the doc carries the detail. Without this the index either bloats or is uselessly terse.
- A **cap/bloat lint** and an **index-coverage lint** (see
  [doc-hygiene-lints](../governance-doc-controls/doc-hygiene-lints.md)); otherwise the index rots.
- A **stable-numbering convention** so rules can be cited by number without churn.

## Consequences & costs

- **Per-invocation context tax.** The index is booted by *every* agent on *every* dispatch, so every
  bullet is paid for continuously across the fleet. This cost is real enough that it needs its own
  mechanism: the cap lint (see [claude-md-rule-index](../governance-doc-controls/claude-md-rule-index.md))
  exists precisely to bound it.
- **Small index ⇒ detail lives elsewhere ⇒ back to pull.** Keeping the index scannable means a rule's
  *detail* sits in a sub-doc the agent must still fetch, re-introducing the availability-vs-binding gap
  for everything past the one-line summary. [Dynamic context injection](dynamic-context-injection.md)
  is the answer to that regress, not this mechanism.
- **Cross-refs rot.** A rule can point at a moved or renamed doc; the conformance lint catches broken
  *links* but not a doc body that has drifted out from under its summary.
- **Admission is judgment-heavy.** The earns-its-spot test ("non-local", "non-derivable") is a human
  call; a lint can bound size but cannot decide what *deserves* the space.

## Known uses

- `CLAUDE.md`: the numbered rule index, boot context for every agent; enforced by
  a governance-doc bloat lint and a rule-conformance lint.
- The repository documentation index: the complete doc index with one-line summaries.
- The "what belongs in CLAUDE.md" three-part test (regression-preventing / non-derivable / non-local)
  that keeps the index minimal.

## Related mechanisms

- *See also (two lenses)* — [claude-md-rule-index](../governance-doc-controls/claude-md-rule-index.md):
  the *same artifact* viewed as **enforced infrastructure** (its hard-counterpart cap/conformance
  lints). This entry is the "shared dispatch-time context" lens; that one is the "enforced governance
  document" lens.
- **Consumer** — [dynamic-context-injection](dynamic-context-injection.md) reads this index and
  delivers its *relevant subset* into a brief at dispatch time.
- *See also (complement)* — [meta-model-consumption](../../models-bridge/system-models/meta-model-consumption.md): the machine-queryable analogue
  for facts that shouldn't live in prose at all.
