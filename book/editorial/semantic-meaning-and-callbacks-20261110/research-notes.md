# Natural-language delegation: source identification

**Best match: FlowCheck** (Vir, Chilton, Zhang, Wu; LMPL2026).

Formative study: four apps × three systems × four scripted stages; 23 failures, 11 statically expressible. All three lost an earlier one-slot-per-speaker rule when later allowing multiple speakers per slot. Separate evaluation: four small JavaScript apps, 30 injected violations; FlowCheck found 30/30 without false positives, best LLM/prompt 26/30, one run per baseline cell. Its interface-level information-flow constraints compile to CodeQL. This establishes supported static checking, not general correctness or ambiguity-failure prevalence. Use the scheduler example for the segue. [Primary paper](https://arxiv.org/html/2608.28880v1), §§3,7; [metadata](https://arxiv.org/abs/2608.28880).

**Other Wu work, different question:** *Passes Alone, Fails Together*, Xia, Wu, and Park, studies semantic coordination between parallel patches. Its mined Django pairs yielded one interference in 834 runs; constructed tasks yielded 97% interference, with an oracle message recovering 82% of runs. This is useful elsewhere but does not directly study vague natural-language delegation. [Primary abstract](https://arxiv.org/abs/2609.25396).

**Older ambiguity work:** *Data Ambiguity Strikes Back*, Huang, Damalapati, and Wu, examines ambiguity in dataset values, coverage, and granularity and the use of documentation in Text-to-SQL. It is narrower than a claim about agent programming in general. [Primary paper](https://arxiv.org/abs/2310.18742).

# Knowledge acquired through training

Codex provides direct evidence of programming capability learned through training on public code (`chen2021codex`, already added for this §1.4 expansion). *Textbooks Are All You Need* supplies a concrete published training example involving filtered web code and synthetic Python textbooks/exercises. The resulting phi-1 performed function-synthesis tasks; it does not establish that every commercial model encountered particular software-engineering textbooks or faithfully acquired every engineering technique. [Primary report](https://arxiv.org/abs/2306.11644).

Economical wording: **“Training on code and technical explanations can give an agent reusable programming knowledge. Published training studies have used textbook-style explanations and exercises alongside code.”** Cite `chen2021codex` and new `gunasekar2023textbooks`. If the author wants “textbooks” without “style,” use “synthetically generated Python textbooks,” which is precisely disclosed in the paper. Avoid claiming undisclosed commercial corpora contain the same material.

This supports the connection from a general trained capability to local system knowledge. It does not itself establish familiarity with all formal modeling languages; retain conditional wording for that claim.

# Bibliography and duplication

No existing keys or records for FlowCheck, Textbooks Are All You Need, the three Wu papers above, their author/title variants, or their arXiv IDs were found in `book/references.bib`. `chen2021codex` should be reused. The accompanying `references.bib` includes the two recommended new sources and two optional Wu sources, with only verified fields. FlowCheck's DOI appears in its primary manuscript; page range was not verified, so omitted. The code-read-only source worktree remains unchanged.

# Suggested use, not additional manuscript copy

1. Training paragraph: one economical sentence connecting code and technical explanations to reusable general knowledge; keep the existing distinction from knowledge of the current system.
2. Natural-language segue: use FlowCheck's speaker-scheduler failure. Explain what the later request meant and which earlier obligation should have survived.
3. Let the existing Environment subsection develop representation, independent checks, and durability. No need to repeat FlowCheck's complete mechanism and evaluation here.
