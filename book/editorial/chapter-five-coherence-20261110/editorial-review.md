# Chapter 5 coherence and evaluation split — linear-flow review

Source revision: `b28acdc700304fe78fc14e9bcfa0c516aa9941d6`. Two directly authorized passes are recorded here: the seven-site coherence edits (`retired-passages.json` / `manifest.json`) followed by the evaluation split (`structural-retired-passages.json` / `structural-manifest.json`). The before-structural snapshots freeze the intermediate working source, so the structural archive's line ranges can be checked exactly even though the earlier prose edits were not yet committed.

## Verdict

The chapter now advances continuously from the factory concept, through one factory's construction and operation, to evaluation, external comparison, and synthesis. The changes concentrate on the boundaries and comparative argument; the internal evidence and six organizational cases remain intact.

## Reading the final progression

**Chapter opening.** The original Key Ideas box is byte-identical and now precedes the body argument. The body widens the view from Chapter 4's engineering episodes to the production system that selects work, supplies knowledge, preserves freedoms, evaluates results, and controls acceptance. The historical paragraph motivates engineering a production system; the single roadmap then distinguishes all five final units. It does not describe the evaluation as part of the construction narrative.

**§5.1 — The Software Factory.** The manufacturing history, controlled-change definition, process-design/tolerance distinction, carrying-cost argument, and four walkthrough questions are unchanged. The new ending explains why the longitudinal DocAble record and public industrial accounts answer those questions at different depths. This gives the reader a reason for both evidence sources without treating them as comparable experiments.

**§5.2 — Inside DocAble's Software Factory.** The opening now identifies the product and the factory as coupled engineering objects before giving the existing measurements. All metric macros, dates, citations and limitations are retained. Counted code and documents are called *supporting source* in the revised prose; the existing support-ratio definition and figure keep their formal metric vocabulary. Coding agents' authorship is explicit: **“Coding agents wrote every line of the implementation.”** Process design and tolerance explain the division of work, then the original chronology proceeds without internal reordering.

The support-ratio evidence and counterfactual field note remain intact. The revised “Inside the Factory” paragraph turns their investment question into concrete purposes: answering system-level questions, deriving checks/configuration, and making selected obligations consequential. This permits both prospective structures and responses to observed problems; it does not assert that every model came from a failure.

The case then retains representations, joins, substitutable reasoning, operating workflow, governance-conversion episodes, and the delegation staircase. It ends exactly where the author's changing work is explained:

> My attention moved toward deciding what should change, which properties mattered enough to represent or enforce, and what anomalous evidence meant. Ambiguous tradeoffs and failures in the factory still required judgment. The environment reduced the implementation I had to read; it did not settle those decisions or eliminate its own maintenance.

There is no added summary after that paragraph.

**§5.3 — Evaluating DocAble.** The new lead states the product/factory evaluation question before the reference workflow. The original order is preserved: Human Remediation as a Reference → Runtime and Cost → General-Purpose Agents and a Specialized Service → What the Economics Establish → Limitations and Maintenance Costs. The first four former nested headings are promoted uniformly beneath the new section unit; the final heading retains its semantic anchor `heading:liability` while displaying the clearer title.

The undergraduate reference is still an institutional workflow rather than expert ground truth. Unattended runtime and billed human labor remain distinct; unmeasured review/correction effort still prevents a measured labor-savings claim. The automated semantic assessment's inconclusive coverage, checker limitations, output-quality scope, and configuration-specific agent comparison are unchanged.

The stale-model incident now opens the limitations discussion by showing how representations can mislead the agents they support. Its consequence is correspondence checking, not a claim that agreement proves correct engineering intent. The following maintenance and single-case limitations paragraphs and the Appendix B reference remain verbatim. The section closes by asking how other organizations' surrounding production systems change, without claiming those organizations need DocAble's particular structures.

**§5.4 — Other Agentic Software Factories.** The opening now contrasts the one-engineer longitudinal case with established teams, processes, knowledge, and distributed obligations. The following interpretive-method qualification is unchanged. Cloudflare → Spotify → Shopify → Uber → Amazon → GitLab remains the organizational order, and every case body is byte-identical to its pre-split version.

The comparative synthesis now examines admission authority before the unchanged discussion of supervisory capacity and carrying cost. The new paragraph respects case scope: Shopify's security workflow, GitLab's documented security-review flow, and Spotify's reported configuration. It compares who or what may admit work; it does not infer that the producing agent's completion claim is adequate evidence or that the mechanisms have measured equal effectiveness. Existing citation keys are reused at their supporting claims; no sources or cases were added.

**§5.5 — Coda: Engineering the Factory.** The revised opening concludes that a factory arranges knowledge, production capacity, evidence, and authority. It no longer repeats the longitudinal-versus-public-report evidentiary contract. The process-design/tolerance payoff and accountability/theory transition remain byte-identical, so the chapter ends with the factory as an object of engineering judgment and prepares Chapter 6's costs and effects.

## Source and asset disposition

Final native sources:

- `book/latex/sources/part5/00-part-intro.tex`
- `book/latex/sources/part5/5.1-software-factory.tex`
- `book/latex/sources/part5/5.2-inside-docables-software-factory.tex`
- `book/latex/sources/part5/5.3-evaluating-docable.tex` — new
- `book/latex/sources/part5/5.4-other-agentic-software-factories.tex` — renamed from former 5.3
- `book/latex/sources/part5/5.5-engineering-the-factory.tex`

The evaluation asset map contains the moved `docable-human-evaluation-261109.svg` entry. Stable figure label **`docable-human-remediation-results`** and its caption/content are unchanged; no figure is duplicated or removed. The factory asset map retains the seven figures still used by §5.2. The empty industrial map moves with its native source to 5.4. The other source/asset pairs are untouched.

## Root-owned integration handoff

No model declaration, source registry, generated Markdown, projection deletion, tool, global redirect, staging, commit, or build was changed in this task. Root owns those surfaces.

- Register new evaluation identity/reference **`sec:evaluating-docable`**, used by the roadmap.
- Move existing industrial semantic identity to the 5.4 source/projection; its organizational and comparative heading labels remain intact.
- Move `heading:economics` and all evaluation subsection/point/figure homes from 5.2 to 5.3. Preserve or redirect any old links that included the old file prefix.
- Retain `heading:liability` as the stable target under **Limitations and Maintenance Costs**.
- The evaluation's back-link to reasoning substitution is explicitly qualified to `5.2-inside-docables-software-factory:heading:exploring-alternative-reasoning-engines`.
- New point ID: **`evaluation-covers-product-cost-and-maintenance`**. All other affected points keep their existing IDs, with summaries updated only where their prose changed.
- Reconcile the chapter-shape/outcomes for 5.2's staircase conclusion, the new evaluation opening/closing, and the revised industrial opening; all exact paragraphs are recorded in `structural-manifest.json`.

## Sanity checks completed

Across the split, all metric-macro multisets and existing citation targets are preserved. All original figure blocks are byte-identical. The Key Ideas and four-principle callouts, counterfactual field note, maintenance/limitations material, six industry case bodies, and coda's final two paragraphs remain intact. Braces and asset-map JSON are valid. No repository tests or PDF build were run; the root integrator will inspect the final numbered sections, cross-references, figure numbering and page flow in the rebuilt edition.

The author’s five-numbered-section outline also requires retiring the `coda: true` source flag from §5.5. That flag is now archived and removed; the Coda title and body remain unchanged. Root handles the corresponding legacy Typst coda-set removal and regeneration.
