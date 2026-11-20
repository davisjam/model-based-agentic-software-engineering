# Appendix B second-pass handoff

Prose frozen in only two canonical files:

- `book/latex/sources/appendix-practicing-mage/getting-started.tex`
- `book/latex/sources/appendix-practicing-mage/brownfield-migration.tex`

B.1 adds “Choose a Modeling Approach” immediately before “Model the Change.” All prior opening material and everything from Model the Change onward remain byte-identical. The addition distinguishes semantic capability from storage/rendering/querying infrastructure, includes the requested formal-verification paragraph, and connects precision's benefits/costs to the §6.1.2 cost-per-correct-admitted-change equation. Cross-references use existing qualified labels for §2.2.2, §3.2.1, and §6.1.2. No numeric gains or total formalism ordering are claimed.

New table label: `practicing-modeling-approaches`. Three left-aligned fixed-width columns: `p{.25\linewidth}`, `p{.31\linewidth}`, `p{.34\linewidth}`. Headers: Approach and examples / Semantic capability / Tooling role and practical use. Seven rows: informal models; UML and PlantUML/Mermaid views; project models/JSON Schema/OpenAPI; Clafer; BESSER; SysML v2/KerML; TLA+/Alloy. Caption has3 sentences (~40 words), makes complementarity explicit, and avoids a ranking. Parent confirmed Appendix B is outside caption-tier linter scope, so no registry change is needed. Parent handles any layout adjustment.

The official-source bibliography keys supplied by parent are used in their relevant rows; all12 cited keys are present in book/references.bib. No bibliography edits by this lane. Alloy temporal support is retained; model analysis and TLAPS proof support are distinguished; BESSER is described as a modeling framework, not an automatic proof system. Visual rendering does not stand in for authoritative semantics.

B.2 uses the user's exact model-coverage/enforcement replacement, inserts the attachment's agent-assisted recovery paragraph before the migration table (with a §4.3.2 reference), and uses the requested Synchronize exit criterion. Independent correspondence evidence remains distinct from establishing intended design. No new terminology is introduced; updated book/AGENTS appendix terminology guidance was read and followed.

`archive-addition.md` has only the two displaced passages, with baseline revision/path/line/local timestamp, for parent to append once. New material is not archived. All earlier anchors remain; new heading label is `heading:choose-a-modeling-approach`. `preservation.json` records checks. Braces balance and `git diff --check` passes. No sync, build, shared registry, or commit.
