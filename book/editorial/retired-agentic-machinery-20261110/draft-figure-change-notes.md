# Revised agentic-substrate teaching plate

Draft only: no shared repository source, generated view, approval record, or Git index was changed.

The plate teaches the engineer's principal locus of control: the environment through which a trained model and harness act on a particular system.

- Model development is a three-stage chain: heterogeneous training data → pretraining/post-training → trained weights. Open-source code is one listed source, not a claim about the whole dataset.
- A clear deployment link carries weights into the foundation-model component of the acting agent. The harness remains a separate peer component.
- Each of the four model properties has a short engineering implication. Column annotations make the implication a requirement of engineering rather than an intrinsic property of the model.
- The engineered environment has the heavy boundary. It includes both the existing system and its engineering structures. The existing system is explicitly the system being changed; it is not represented merely as material loaded into context.
- Actions/changes flow toward the system. Guidance and governance have separate upward connections and descriptions.
- The external engineer has a solid principal maintenance link. Optional training/fine-tuning uses a lighter dashed outside route, labeled in full.
- Region headings are centered or left aligned according to role; the acting-agent heading is centered on its complete region. The maintenance label sits immediately beside the actual short vertical arrow.

## Files

- `agentic-substrate.tex`: native editable TikZ replacement.
- `agentic-substrate.svg`: live editable web counterpart, with title/description and the same geometry, text and relationships.
- `agentic-substrate.scene.json`, `build_figure.py`: common content/geometry scene and local generator for both editable formats.
- `proof.pdf`, `proof.png`: final native-size proof.
- `svg-proof.png`: separately rendered web proof. Rerendered with the existing renderer’s Fontconfig backend and bundled static Source Sans 3 files; font identity now matches the native proof. A fallback-font rendering was also inspected.
- `receipt-draft.json`: fresh receipt with current paths, hashes, design decisions, alt text and measured outcomes. It does not carry forward the prior figure's stale fidelity claims.
- `typography-review.json`: 34 checks suitable for merging into the global review entry.
- `layout-contracts.json`: two peer contracts suitable for merging into the global review entry.
- `geometry-audit.json`, `geometry-annotated.pdf`, `typography-audit.json`: audit outputs.
- `originals/`: untouched original TikZ, SVG and receipt copied from the read-only repository for archiving.

## Verification

The final proof is **446.844 × 557.644 bp** including preview border. It fits the 450 × 560 bp artwork envelope at its authored size and leaves **90.356 bp** in the book's 648 bp text height for caption/float spacing. The complete figure and its chosen caption still need inspection in the rebuilt chapter. Do not shrink it.

Authored type is 9.5–11.5 pt. The native proof uses the bundled Source Sans 3 regular, bold and italic faces, as verified against the book's actual figure-font reference. Compiler diagnostics: zero warnings/errors, no overfull boxes, no missing glyphs. Geometry: **zero findings**, including both explicit peer groups. Semantic typography: **34 checks, zero findings**. Rendered pixels are monochrome.

The SVG source heuristic has one known false-positive canvas-overflow warning for the rotated optional-training label; the heuristic measures it horizontally. Both native and web renderings show the label outside the panels and inside the canvas. There are no other SVG overflow/overlap candidates after wrapped lines were authored as individual live text elements. The actual shared overflow, occlusion, intrusion, label-collision and font-band sensors all report zero findings on the SVG; the rotated-label heuristic is audit-only and needs no exemption or gate change.

## Possible concise caption

*Commodity intelligence and its engineered environment.* Training supplies general capabilities; the harness turns them into actions on a particular system. The engineer's principal control lies in the surrounding knowledge, permissions, evidence, and admission mechanisms. The dashed route shows optional changes to model weights.

The prose or caption should state that commercial training-data composition is not fully disclosed, as the integrating author has planned. No separate disclosure block was added inside this already full teaching plate.

## Integration

Replace the SVG and native TikZ together. Archive `originals/` through the normal cutting-room workflow. Merge the new typography checks and peer contracts, rather than retaining the old Agent / A tool-using reasoner checks. Preserve the existing publication approval policy. Rebuild and check the entire float on its chapter page.
