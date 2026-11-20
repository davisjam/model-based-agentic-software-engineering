# Appendix B follow-up handoff

Changed only canonical prose in `_opening.tex`, `getting-started.tex`, `brownfield-migration.tex`, and `operating-a-gee.tex` under `book/latex/sources/appendix-practicing-mage/`. `measuring-mage.tex` remains byte-identical.

- B.1: applied the user's exact three paragraphs in place of the old first two, retaining Inventory; structural models remain “often a good starting point,” not required. Replaced the heading with “Model the Change” while retaining `heading:use-a-change-as-the-first-model`. Adjusted the ticket opener to follow the model-first introduction, clarified cost-effectiveness, and named who uses ticket links.
- Opening: “section that addresses your current engineering question.”
- B.2: Audit discovers/triages discrepancies; Synchronize resolves selected discrepancies before reliance. Audit table exit criterion now requires checking needed claims and assigning consequential discrepancies an owner and next action. All other table cells remain unchanged.
- B.3: named DocAble's design document and its content directly; marked first-commit planning as a DocAble procedure. No incident, recovery account, or evidence limitation changed.

The historical/current ticket paragraph and final B.1 paragraph are unchanged. All existing anchors and links remain. Both existing tables remain, with one requested Audit exit-criterion cell changed. Figure B.1 and its existing lead-in now immediately follow the B.3 opening paragraph, before the DocAble document taxonomy. This is a pure move: figure/caption/lead-in text unchanged, no new archive entry or caption-tier impact. The longer Audit exit cell may need ordinary pagination inspection during the parent build.

Ten actual replacements archived with baseline revision, original path/line, and local timestamp in `archive-addition.md`; parent should append this one draft once. `preservation.json` records checks. No shared registry edits, sync, build, or commit. `git diff --check` passes.
