# §1.4 reasoning and training sources — verified 10 November 2026

Deliverables are drafts only; no shared repository files or commits were changed.

- `reasoning.tex`: approximately 455 words, five main references, native LaTeX; citations precede punctuation. The progression is training objective → behavioral evidence → representations and interventions → program semantics → one collective scope paragraph → functional definition and the classroom opportunity. It omits the optional causal-probing sentence.
- `references-additions.bib`: four new main entries, plus Codex, InstructGPT, and LoRA supporting the surrounding training account.
- `existing-reference-updates.bib`: proposed replacement for the existing `othello-gpt` record, retaining that key but updating it from the 2022 preprint to ICLR 2023. Its current URL already identifies the research paper, not a blog. Do not also add `li2023emergent`: that would duplicate the same publication.
- `optional-causal-reference.bib`: separately preserved, correctly attributed published COLM version.

## Evidence and scope

**Bender et al., 2021.** The ACM record confirms title, four-author byline, venue, pages 610–623, and DOI 10.1145/3442188.3445922. The draft uses its caution about confusing convincing language with understanding, not a theorem that predictive learning cannot produce semantic representations. [ACM primary record](https://dl.acm.org/doi/10.1145/3442188.3445922).

**Bubeck et al., 2023.** Primary arXiv report documents behavioral demonstrations with an early GPT-4. Keep AGI as the authors' interpretation. I removed the supplied passage's inference that success on allegedly unfamiliar tasks establishes production beyond memorized examples: these demonstrations do not by themselves exclude training-data contamination or establish the mechanism. [Primary report](https://arxiv.org/abs/2303.12712); [author publication page](https://www.microsoft.com/en-us/research/publication/sparks-of-artificial-general-intelligence-early-experiments-with-gpt-4/).

**Li et al., ICLR 2023.** Othello-GPT predicts legal moves from transcripts, rather than being trained to win. Nonlinear probes decode board state; activation interventions alter move predictions for counterfactual boards. This supports a computational role for the representation in this controlled task, not general competence at modeling the real world. [Primary paper](https://arxiv.org/pdf/2210.13382); [conference record](https://openreview.net/forum?id=DeG07_TcZvT).

**Nanda et al., BlackboxNLP 2023.** The player-relative MINE/YOURS encoding supports linear probes and vector interventions. It refines how the Othello representation is described. Metadata, DOI, and pages are verified against the publisher export. [ACL primary paper/metadata](https://aclanthology.org/2023.blackboxnlp-1.2/).

**Jin and Rinard, ICML 2024.** Intermediate execution states are withheld from prediction targets in the synthetic navigation-language experiment. Probes recover abstractions of those states. The alternative-semantics control preserves program syntax while changing interpretation; better decoding of the original semantics counters the hypothesis that the probe alone interprets a syntactic record. This control differs from editing hidden activations to demonstrate causal use by the LM. Do not claim that the experiment proves faithful interpretation of arbitrary production programs. [PMLR primary export](https://proceedings.mlr.press/v235/jin24e.html); [author-hosted paper](https://people.csail.mit.edu/rinard/paper/icml24.pdf).

## Optional COLM authorship correction

The **published COLM 2024 paper lists Charles Jin alone**. Its first-page footnote acknowledges Martin Rinard's senior contribution and explains that a clerical error omitted him from the official author list. The extended arXiv v2 lists both authors. Preserve the distinction between these versions rather than combining one version's authors with the other's venue. The proposed main text omits this optional citation entirely; ICML and Othello already explain the methodological point. [Official paper](https://openreview.net/pdf?id=98ekcwQqb7); [official accepted-paper list](https://github.com/COLM-org/COLM2024/blob/main/AcceptedPapers.html); [extended preprint](https://arxiv.org/abs/2407.13765).

The COLM framework uses structural causal models and mediation to distinguish latent concepts learned by the LM from the contribution of the probe. It concerns the known generative structure of synthetic text, not a complete causal account of a frontier LLM's reasoning.

## Surrounding training account

1. **`chen2021codex`**: public GitHub code, autoregressive code generation, training/fine-tuning distinguished from sampled inference. It establishes an example, not the complete training mixture of all current models. [Primary Codex report](https://arxiv.org/abs/2107.03374), especially §3.1–3.2.
2. **`ouyang2022instructions`**: pretrained GPT-3 followed by supervised demonstrations and reinforcement learning from ranked human feedback. Supports instruction following, not tool-use training or every kind of problem-solving improvement. Use: “Additional training can improve how a model follows instructions and responds to user requests.” [NeurIPS primary record](https://proceedings.neurips.cc/paper_files/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract-Conference.html). Publisher metadata spells Jeff Wu as Jeffrey Wu; additions follow that export. Pages 27730–27744 also verified by the proceedings distributor's [DOI record](https://www.proceedings.com/068431-2011.html).
3. **Existing `yao2023react`**: inference-time reasoning/action/observation loop with a frozen model. Cite separately for the harness cycle, not as proof that RLHF teaches tool use. [Author-hosted primary paper](https://ysymyth.github.io/papers/react_llm.pdf).
4. **`hu2022lora`** (optional surrounding support): weight adaptation can use fewer trainable parameters than full fine-tuning. This supports the comparative accessibility of adaptation, not a universal claim that any frontier model can be fine-tuned by any engineering team. [ICLR primary paper](https://openreview.net/pdf?id=nZeVKeeFYf9); [primary arXiv record](https://arxiv.org/abs/2106.09685).

For the public-data qualification, a short prose addition is justified: “Commercial training mixtures are not fully disclosed, and may also include licensed or otherwise nonpublic material.” The GPT-4 report explicitly identifies publicly available and licensed data while withholding dataset-construction details. [Primary report](https://cdn.openai.com/papers/gpt-4.pdf), §2. This is optional support, not included as another bibliography entry because the figure's caveat plus representative examples may suffice.

## Editorial reconciliation

- User-supplied `li2023emergent` is genuine but duplicates existing `othello-gpt`; preserve existing key and upgrade metadata.
- All five main works have verified primary publication records. Bubeck remains an arXiv report, not a peer-reviewed conference article.
- The source of a learned ability, the presence of a representation, and reliable engineering performance remain separate questions. No consciousness or human-cognition premise is needed.
- The draft gives Rinard's controlled experiment more explanatory space than Sparks and returns directly to the author’s students at its close.

## Latest editorial revision

The research draft now leads with positive findings. Bender supplies attributed intellectual context; Sparks presents demonstrated behavior without an AGI interpretation debate. The Jin/Rinard paragraph presents its control as positive experimental methodology. One collective scope paragraph follows the evidence, and the functional close returns to the classroom opportunity. Individual-study cautions in these research notes remain for factual review, not as instructions to reinsert them throughout the prose.
