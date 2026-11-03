# MAGE editorial review queue

Created 3 November 2026 from the author's Chapter 1 review. These are follow-up audits; the book-wide passes have not yet been performed. The inset entry-and-return policy is recorded in [AGENTS.md](AGENTS.md#11-use-insets-as-an-optional-second-track).

## Material on the cutting-room floor

- [ ] Review the material preserved in [editorial/cutting-room-floor.md](editorial/cutting-room-floor.md), including deferred explanations and related-work references.
- [ ] For each entry, decide whether to retain it for later consideration, propose a specific new home, or cut it permanently. Record the decision alongside its provenance. Archiving material does not authorize relocating it without the author's approval.
- [ ] Check proposed reuse against the destination's argument and the concepts available to its reader. Avoid restoring repetition or premature detail that motivated the original cut.

## Insets: entry, depth, and return

- [ ] Inventory the insets by chapter and stable label. Read each with the mainline prose immediately before and after it.
- [ ] Check the entry: does the opening pick up what the reader has just encountered and explain why this deeper treatment belongs here? An inset should not begin as an unrelated reference entry.
- [ ] Check the explanation: does it answer one useful question with enough detail, a concrete example, and any necessary formalism? Preserve the textbook register; brevity alone is not the goal.
- [ ] Check the return: does the ending connect the explanation back to the chapter's argument without merely repeating the opening?
- [ ] Check both reading paths. A reader who takes the inset should rejoin naturally; a reader who skips it should still be able to follow the mainline.

The motivating example is §1.3, **Context Windows and Compaction** (`inset-context-windows-and-compaction`): enter from the reasoning-horizon discussion, explain the specific LLM mechanisms and their limitations, and return to the broader system-level concept. Its revised opening is currently in the Chapter 1 review proposal.

## Chapter-ending learning material

The chapter endings need an explicit pedagogical design. Audit what is already present, then consider the currently missing chapter-end apparatus rather than assuming the book has no worked examples elsewhere.

- [ ] Identify where a **worked example** would help readers apply the chapter's ideas. Show the problem, engineering choices, reasoning, and resulting evidence or tradeoffs.
- [ ] Identify useful **exercises or discussion questions** that ask readers to apply the ideas, compare choices, or justify a model or control. Decide where worked answers or instructor guidance would help.
- [ ] Consider a short **“To read more”** section with selected, annotated readings: what each offers and why a reader might follow it. Avoid turning it into an exhaustive related-work inventory.
- [ ] Decide which elements belong in which chapters and which, if any, belong in the web edition. Choose a recognizable format without requiring identical additions to every chapter; consider the print word budget.

For each audit finding, record the chapter or label, the reader's difficulty, the proposed change, and the author's decision. Keep proposed changes distinct from approved and applied edits.
