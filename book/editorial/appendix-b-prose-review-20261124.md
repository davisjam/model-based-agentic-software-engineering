# Appendix B practical-reference edit — 2026-11-24

Appendix B helps readers choose, introduce, operate, and evaluate MAGE. Its four sections remain independently consultable. The chapter-specific guidance in `book/AGENTS.md` now records that purpose, the emphasis on decisions and tradeoffs, and the distinction from Appendix A's construction blueprints.

## Changes

- B.1 compresses the opening, activity selection, formal verification, and shared-infrastructure discussion. The work-order and historical/current-model distinction moves into delegation boundaries; the separate “Model the Change” heading is removed.
- B.2 keeps the migration stages, exit criteria, and orphan classification. Documentation is presented as an option. The deployment example describes a verified mirror; transferring authority remains a separate migration decision.
- B.3 explains the workflow in three paragraphs, preserves the four brief categories, and treats validation scheduling as an operating tradeoff. Schedule configuration, execution, acknowledgment, and verified repair remain distinct. A lock bounds concurrent sweeps, not total work.
- B.4 condenses baseline, established-metric, and diagnostic discussion while retaining metric definitions, observation health, and limitations on inference.
- All four principal tables and Figure B.2 are preserved. Figure B.1 is 17.86% shorter (224 to 184 bp), with unchanged concepts, text sizes, and line weights. Its paired SVG/TikZ generator remains the single geometry source.

Complete replaced prose is retained in the cutting-room archive. Private editorial material and preservation records remain under the ignored evidence directory. No new measurement or execution claim is introduced.

## Verification

The standalone PDF rebuild contains **15 pages**, down from 17: 12 pages of appendix content plus cover, contents, and bibliography. Rendered-prose word count falls from **6,208 to 4,853** (1,355 words; 21.8%).

All four numbered section bookmarks, four single-page tables, and two native figures pass the standard checks. The 143-figure native pool passes geometry and typography checks, and the appendix compiles with zero unapproved TeX diagnostics. Page-context review covers the modeling table, compact recovery triptych, migration table, operating figure, metric tables, and final section. No font reduction is used to achieve the page savings.

The obsolete, unreferenced “Model the Change” heading anchor is removed with the heading. Historical/current-model guidance remains in B.1 and B.4; all other labels and all citation keys are preserved. Duplicate adjacent evidence comments in B.3 are consolidated; separate substantive uses retain their own source annotations, including E33 for the validation-scheduling examples.
