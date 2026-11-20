# Reading-guide appendix destinations

The native and SVG sources are edited and frozen. No shared registries were modified by this agent.

Apply the one-figure registry updates from the repo root:

```sh
python3 book/editorial/appendix-a-navigation-20261120/integrate.py --apply
```

The script verifies both source hashes, updates only the `book-map` row in each registry, preserves unrelated rows, adds four semantic typography checks, and copies the revised receipt. Existing review history is retained, with the complete prior receipt and source pair in `before/`.

## Geometry and semantics

- Original chapter sequence and chapter geometry remain unchanged, including the shaded Chapters 2–5 region.
- Two regular-weight reference boxes appear beneath Conclusion, connected with dashed lines without arrowheads. They are outside the chapter sequence.
- Appendix A is labeled “Engineering Blueprints”; Appendix B is labeled “Practicing MAGE.”
- Native 10pt labels are retained. Print proof is192.761×378.142bp, including3pt border. Width remains within the existing narrow reading-guide column; added height is60.175bp.
- Source SVG retains its established color/detail variant and adds the same destinations. No pre-existing subtitles or chapter labels were rewritten.

## Validation

- Proof: `/tmp/mage-navigation-followup/proof.pdf`
- Native raster: `/tmp/mage-navigation-followup/native.png`
- SVG raster: `/tmp/mage-navigation-followup/source.png`
- Native compiler:2passes, zero unapproved diagnostics.
- Geometry: zero findings.
- Typography:16checks, zero findings.
- Both raster outputs visually inspected. Appendix labels fit and branches are clear.

Parent must inspect the assembled front matter to ensure the taller map and extra reading route still fit naturally. `tools/mage_figure_layout.py:reading_guide_columns` supplies hardcoded alternate text; extend it to mention the appendix reference destinations. Parent owns that change.

No caption edit is needed for the existing short caption, but any additional caption wording should also update the registry inventory caption when integrated. Do not rerun older map generators over this pair.

## Linked-reference follow-up

Both appendix names now use `magebookref` with verified full-book destinations `chapter:appendix-handbook` and `chapter:appendix-practicing-mage`. Isolated proof link collection confirms ten clickable regions for nine destinations (seven chapters and two appendices; Chapter5 spans two lines); source-link and aux-target checks pass. Fresh hashes/receipts are included. Re-running the integration script updates only book-map and leaves other agents’ rows intact.
