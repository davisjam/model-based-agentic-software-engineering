# Appendix A blueprint drawings

Each generator emits paired SVG and TikZ from one geometry. Source Sans 3 matches the current book figure font. Captions live in the canonical manuscript, outside the artwork; generator caption files are draft aids only.

From the repository root, run `python3 book/figures/blueprints-20261124/a7.py --output-dir /tmp/A7-regenerated` (and a8.py / a9.py similarly). Copy the generated SVG to `book/assets/` and TikZ to `book/tikz/figures/`, update review hashes, then run the native figure pool and integrated book checks. A8 resolves the repository font directory automatically or accepts `--repo-root`.

The author-provided targets and private implementation archaeology are preserved under ignored `book/data/local-evidence/evidentiary-basis-11202026/integration/blueprint-followup-20261124/`. The artwork preserves their layout while correcting the scope of scheduler projections, lease accounting, and memory admission.
