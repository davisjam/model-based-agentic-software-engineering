# Chapter opening continuity review — 2026-11-24

The author-approved copyedit establishes a common purpose for the seven chapter openings: a motivating question, conceptual orientation in Key Ideas, and two or three paragraphs ending in a section roadmap. The convention is recorded in `book/AGENTS.md` and preserves the different editorial purposes of the chapters.

## Applied copyedits

| Chapter | Question | Other changes |
| --- | --- | --- |
| 1 | What engineering problems arise when software implementation becomes cheap? | Retain the economic analogy and its citations; add the five-section roadmap. Keep Key Ideas. |
| 2 | What should we abstract from a system, and how should we represent it? | Orient the reader to purposeful representations; end Key Ideas with the canonical Modeling Principle. Add the roadmap and retain the four-question guide. |
| 3 | How can I enforce the obligations expressed in engineering models? | Expand the orientation and end Key Ideas with the canonical Alignment Principle. Reduce the opening to three paragraphs, retaining the billing example, engineering precedents and citations, and a five-section roadmap. |
| 4 | How does MAGE work as systems change? | Explain evolving models and controls, end Key Ideas with the cycle, and replace the opening with two paragraphs and a four-section roadmap. |
| 5 | How should we organize software production when agents do much of the implementation? | Change the question only; retain the existing Key Ideas and opening. |
| 6 | How does MAGE turn agentic capacity into durable engineering progress? | Retain the latest approved question, Key Ideas, and first opening paragraph. Add the four roadmap references and shorten the repeated Chapter 5 introduction in §6.1. |
| 7 | What becomes of engineering when agents do more of the work? | Replace retrospective recap with the proposed professional questions and a five-section roadmap. Describe §7.5 in terms of retained accountability rather than a permanent human-only set of decisions. |

Canonical Modeling and Alignment Principle wording is unchanged. The three formal closing statements in Chapters 2–4 are italicized and centered in print, web, and EPUB; other Key Ideas paragraphs retain ordinary alignment. Roadmaps use single-label `\cref{chapter:<actual-slug>}` references supported by the native-to-web projection, rather than the editor's placeholder labels.

## Figures and layout

Figure 3.1 retains its caption, labels, fonts, inner boxes, arrow directions, and vertical geometry. The native outer side clearance increases from about 0.6 pt to 9.2 pt. The native footprint is 437.242 × 218.702 bp; SVG panels receive equivalent side clearance. The isolated figure passes geometry, typography, and monochrome checks.

Figure 3.2 was still in the introduction, contrary to the editor's assumption. Its unchanged figure and asset mapping now reside in §3.1, with a short explanation of constraints, sensors, and gates. Numbering remains 3.1 for the interaction diagram, 3.2 for the alignment architecture, and 3.3 for intervention boundaries.

The print renderer keeps organizing figures before their chapter's first substantive section. Local space requests keep Chapter 3's roadmap together and prevent Chapter 2's four-question reading guide from splitting across pages. This reflow exposed a forced-inline placement of the near-full-page modeling-repertoire figure that stranded its lead-in on a mostly empty page. Allowing that figure to float fills the gap with existing text and the table, preserving the figure's size and content; the compact routes diagram remains in place.

## Evidence and review

Displaced prose is preserved in the cutting-room floor. Before-edit sources and the independent prose and figure reviews are preserved under ignored local evidence in `integration/chapter-openers-20261124/`.

The review confirmed all roadmap targets against current source files; exact preservation of Key Ideas in Chapters 1, 5, and 6; unchanged canonical principle wording and Figure 3.1 caption; and that shared figure-registry changes concern only Figure 3.1. The full-book verification confirms all seven chapter questions fit on one line, all 53 numbered section bookmarks resolve, all tables remain on single pages, and the layout, overflow, and caption checks pass. The EPUB contains the three centered closing statements and passes its link/container checks.


## Final build

Full book: 305 PDF pages; 109,099 rendered prose words. All 13 standalone PDFs pass (12 compiled in the final run; Chapter 2 reused from the verified local proof with identical inputs). EPUB rebuilt. No publication or push was requested.

| PDF | Pages |
| --- | ---: |
| `mage-book-00-FrontMatter.pdf` | 18 |
| `mage-book-01-Chapter1.pdf` | 18 |
| `mage-book-02-Chapter2.pdf` | 43 |
| `mage-book-03-Chapter3.pdf` | 39 |
| `mage-book-04-Chapter4.pdf` | 39 |
| `mage-book-05-Chapter5.pdf` | 37 |
| `mage-book-06-Chapter6.pdf` | 29 |
| `mage-book-07-Chapter7.pdf` | 34 |
| `mage-book-08-Conclusion.pdf` | 5 |
| `mage-book-09-Appendices.pdf` | 60 |
| `mage-book-10-BackMatter.pdf` | 4 |
| `mage-book-11-AppendixA.pdf` | 47 |
| `mage-book-12-AppendixB.pdf` | 15 |
