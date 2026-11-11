# textbook.md — the engineering-textbook register

Use this resource when writing or reviewing an engineering book or sustained technical explanation.
The reader is a technically capable engineer learning the argument. The prose should develop the
reasoning needed to understand and apply an idea, including the mechanisms, alternatives, costs,
and judgment that make it useful. [`document-types.md`](document-types.md) governs the larger arc;
this resource governs the teaching within it.

## Develop the reasoning

Connected paragraphs usually carry the argument. Give each paragraph a job and develop it through
explanation, mechanism, example, or consequence. Connect it to the question the reader has reached.
Start with a problem, question, example, or claim according to what makes the idea intelligible.
A definition may follow the intuition that gives the reader a reason to need it. Reference entries
and glossaries still begin with their definitions.

Preserve precise technical terms and use ordinary syntax around them. Name the actor and what it
does: a validator compares documents and fails a job when content is missing. An abstraction earns
its place when the reasoning needs it; abstract wording that hides an operation does not.

First person can expose an engineer's decision. Direct address can guide an inference. A question
can introduce a real design problem, and a list can make alternatives comparable. Use these when
they teach; neither impersonal prose nor continuous prose is an end in itself.

Use literature to develop the engineering explanation. Synthesize a body of work through the shared ideas
the reader needs, with representative citations at the claims they support. Attribute borrowed concepts
and vocabulary. Use individual studies or products when their specific results or mechanisms matter.
In a teaching passage, close with what the engineer can understand or do; reserve arguments about the
book's novelty or durability for a place where those questions are actually at issue.

Place citations before terminal punctuation throughout the manuscript, including prose, captions, insets,
and footnotes. In native LaTeX, separate a citation from the preceding text with a nonbreaking space,
as in `word~\citep{key}.` Use `~` before narrative citation commands such as `\citet{key}` as well.
Preserve citation targets and ordering.

## Judge length by explanatory work

Before shortening, ask **what must the reader now infer?** Keep intuition, worked examples,
transitions, and deliberate repetition that helps the reader test, connect, or apply an idea.
Returning to the same example can expose a different distinction. Cut repetition that merely
asserts the same claim again, along with ornament and announcements of importance.

Before expanding, ask **what question does this addition answer?** More prose earns its place by
resolving a difficulty or preparing a later inference. Do not add every qualification a specialist
could demand. Keep qualifications that change the claim or the engineering decision beside it;
move secondary detail to a footnote or inset, or defer it until the reader needs it. Preserve the
conditions of a simplified model so the explanation does not teach a false rule.

Increase density as the reader learns the vocabulary. Use established names without re-teaching
them, while explaining new relationships and new reasoning. A later chapter can rely on an earlier
definition; it still owes the reader the steps of its new argument.

## Calibrated editorial examples

These examples come from the MAGE introduction review of 3 November 2026. Item IDs record editorial
provenance; the examples are self-contained. Quoted excerpts reproduce the review text. Retention,
expansion, and deletion are all valid outcomes.

1. **Keep two paragraphs when the second teaches a distinction.** In `s11-database-freedom`, the
   author retained the database example beginning “Suppose a service needs persistent storage.”
   and the following paragraph beginning “Notice the distinction between unmodeled and free.”
   The first works through acceptable database alternatives. The second returns to that choice
   to distinguish an omitted obligation from a deliberate degree of freedom. Combining them
   would remove useful reasoning, even though the example repeats.

2. **Add intuition when notation alone asks too much.** In `13-reliability`, the approved explanation
   adds: “Remember, when you multiply fractions between zero and one, the product is smaller than
   any of the factors.” It then compares the agent's chance of implementing all features correctly
   across several feature counts and reliability levels. The preceding model states the independence
   assumption. The extra prose explains the equation's effect without presenting that assumption
   as a fact about all agent work.

3. **Replace an abstract operation with what happens.** In `14-together`, the original says
   “Alignment enforces selected obligations over realization.” The revision develops the connection
   through DocAble's content comparison: “The validator fails the job if the revised document is
   missing any of the original extracted content.” The added example makes enforcement intelligible
   while retaining Modeling and Alignment as the names of the concepts.

4. **Lead with the claim the reader needs to understand.** In `62-h4`, “Representation induction
   and innovation” becomes “Discovering new ways to model systems.” The opening states: “More
   capable agents may help engineers model systems in ways they had not previously considered.”
   The rest explains the possibilities and retains independent validation, maintenance cost, and
   comparison under the same resources and quality requirements. Plainness does not remove the
   hypothesis or its conditions.

5. **Place detail where it advances the argument.** In `13-enforcement`, a repeated enforcement
   subsection was removed and archived: the preceding example already demonstrates enforcement,
   and a later chapter develops the mechanisms. In `14-opening`, a useful qualification remains
   in a footnote: “Or at least, correctly enough that we can finish the job economically.” The
   footnote counts human cleanup and a more expensive model in completion cost. One edit defers
   material; the other preserves it where the reader can use it without losing the main thread.

6. **Keep the engineer's question when it explains the decision.** In `42-partition`, the revision
   explains that finer document chunks reduce memory use but lose semantic context and increase
   coordination cost. It closes: “I asked myself: why did so much of the document have to reside
   in the worker at all?” The question prepares the architectural change that follows. Replacing
   it with an impersonal summary would hide the reasoning behind the choice.

### Preface calibration: scope, precision, and authorial voice

The Preface review of 6 November 2026 supplies four further examples (settled copyedit
`de2ba6b5d`, including the author's decisions to retain wording). These illustrate judgment within
the register; they are not phrases to copy or exceptions to apply mechanically.

1. **State what the evidence contributes.** The revised evidence paragraph says: “DocAble provides
   depth about engineering decisions and their consequences; the industrial accounts provide
   variation across organizations and production environments.” That comparison explains how to
   read the evidence. The chapter reference then directs readers to its limits and supporting
   sources. Scope remains explicit without repeating a disclaimer after each claim. Likewise,
   the Kiro paragraph acknowledges an existing approach before stating the book's question:
   “how engineers preserve understanding and control as the system evolves.” In a preface,
   position the contribution through the problem it develops, with proportionate acknowledgment
   of prior work.

2. **Check whether a simpler phrase changes the claim.** The author retained “every act required
   to realize a system”: replacing *realize* with *implement* would narrow a statement that also
   concerns design, analysis, and validation. Conversely, “four recurring engineering activities”
   replaces wording that made the method sound like a fixed sequence. The revision explicitly
   says those activities need not occur in a fixed order. An editorial change to vocabulary or
   presentation can change the engineering account; compare meanings before judging fluency.

3. **Keep deliberate voice and useful enumeration.** The author retained “the most interesting
   thing about DocAble is not DocAble. It is MAGE.” Here the contrast redirects attention from the
   case to the book's subject. The Apple inscription example also retains its enumeration of
   architecture, requirements, and tolerances: those particulars explain which decisions can
   remain with the designer when realization is delegated. Neither a familiar rhetorical form
   nor a long sentence is sufficient reason to cut. Judge its work and its frequency in context.

4. **Give supporting material the right place in the argument.** Four engineering questions were
   removed from a terminology footnote and placed in the Chapter 1 opening. A useful comparison
   of context and models moved to §1.4, allowing the Preface section to close on engineering
   authority. These were placement decisions, not judgments that the passages were unnecessary.
   A footnote should serve its local explanation; a section's last paragraph should complete
   its argument. Preserve useful displaced material and check the transition at its destination.

## Review the teaching

Read the passage with its neighbors. Can the reader follow the reasoning, see what the mechanism
does, and judge when the choice is worth its cost? Compare what each retained, added, or removed
sentence contributes. Then run [`audit.md`](audit.md); its length and repetition heuristics are
prompts for judgment, not instructions to compress a developed explanation into a reference entry.
