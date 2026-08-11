# *Model-Based Agentic Software Engineering* — the book

*Architecture, Validation, and Control for Agentic Software Engineering.* The book renders to a
small static HTML site by `build_book_html.py` (wired into `catalog.py build`).

## Part/Chapter filesystem hierarchy

The source tree **encodes the hierarchy**: a chapter lives at `part<N>/<N>.<M>-<slug>.md`, so the
part number and chapter number are explicit in the path. `build_book_html.py` walks the tree,
derives PART.CHAPTER from the path, and reads the `<!-- part-title --> <!-- chapter-title -->`
metadata from each file. It emits one flat `<slug>.html` per chapter plus `index.html`, and appends
a Gang-of-Four appendix projected from the sibling catalogue entries.

```
book/
  frontmatter/0.1-the-mage-method-at-a-glance.md, 0.2-what-this-book-argues.md, 0.3-the-books-language.md,
             0.4-preface.md, 0.5-how-to-read-this-book.md, 0.6-acknowledgments.md
  part1/  (Part 1 — The Context)
    1.1-the-printer.md
    1.2-mage-by-example.md
    1.3-loops-and-models.md
    1.4-why-mage-follows-from-the-machine.md
    1.5-the-engineers-seat.md
  part2/  (Part 2 — The Mindset)
    2.1-context-is-the-first-modeling-problem.md … 2.12-keeping-models-in-sync.md
  part3/  (Part 3 — The Governed Engineering Environment)
    3.1-the-agent-stack.md
    3.2-models-and-the-semantic-gap.md
    3.3-constraints-sensors-validators-gates.md
    3.4-governance-conversion.md
    3.5-when-guardrails-collide.md
  part4/  (Part 4 — Putting It to Work)
    4.1-the-mage-workflow.md
    4.2-brownfield.md
    4.3-validating-change.md
    4.4-the-skills.md
    4.5-lifecycles-and-runbooks.md
    4.6-metrics.md
  part5/  (Part 5 — The Evidence)
    5.1-the-problem-and-the-bar.md
    5.2-the-build.md
    5.3-the-road-to-mage.md
    5.4-failures-that-became-infrastructure.md
  part6/  (Part 6 — Toward a Theory of MAGE)
    6.1-toward-a-theory-of-mage.md … 6.8-conclusion.md
  part7/  (back matter)
    7.1-about-the-author.md
    7.2-colophon.md
  appendix-front-door.md, appendix-stacks/, appendix-notes/, appendix-operators-reference/,
             appendix-skill-recipe/, appendix-c/    # hand-authored + catalogue-projected appendices
  data/metrics.json      # headline numbers, referenced from prose via {{token}}
  assets/                # figure assets (inline SVGs)
```

Each part's number and each chapter's `<N>.<M>` are explicit in the path; `00-part-intro.md` in a
part directory carries that part's divider/epigraph page. Front matter (Preface) renders before
Part 1. The appendix pages are generated from a mix of hand-authored `.md` (the stacks, the
operator's reference, the skill recipe) and the catalogue entries (Appendix C's mechanism
catalogue), and render after Part 6 / Part 7.

## Authoring notes

- **Metadata.** Each chapter carries two comments: `<!-- part-title: … -->` and
  `<!-- chapter-title: … -->`. The leading `# …` H1 is dropped on render (the header comes from
  metadata), so keep or change it freely.
- **Metrics tokens.** Numbers that recur (weeks, LoC, costs) live in `data/metrics.json`. Reference
  them from prose with `{{token}}`; the build substitutes them and **fails loud** on an unknown token.
  Edit the number in the JSON, never in the prose. A later pass refreshes the repo-derived figures
  from history-mining; the cost-model and policy figures are the book's canonical estimates.
- **Epigraphs.** The first chapter of each numbered Part opens with an epigraph, defined in
  `_PART_EPIGRAPHS` in `build_book_html.py`. The Macbeth (Part 2) and Ecclesiastes (Part 4) quotations
  are verbatim from the source memoir; the Context and Governed-Environment openers are candidates a
  human editor may swap.
- **Figures.** Insert a figure with a directive comment: `<!-- figure: assets/<file> | <caption> -->`.
  An `.svg` is inlined (its own `<title>`/`<desc>`/`aria-*` survive); any other extension is wrapped in
  `<img>`. A missing asset fails the build.
- **Copyright.** Every page footer carries `© James C. Davis, 2026–present`.

## Build

Run `python3 build_book_html.py` (stdlib-only) or, from the catalogue root,
`python3 catalog.py build` (builds the book as part of the site and runs the orphan-reachability gate
over the book pages too). Never hand-edit the `.html`.

The book's appendix references catalogue-root figures. Run `catalog.py build` (regenerates
`catalogue-views.html`) before or alongside `build_book_html.py`, and commit both, so any deployed
cross-references resolve.
