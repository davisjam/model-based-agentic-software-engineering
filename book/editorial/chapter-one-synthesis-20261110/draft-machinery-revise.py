from pathlib import Path
import re,hashlib,json
root=Path('/private/tmp/mage-docable-glimpse-20261109');out=Path('/private/tmp/mage-ch1-followup-20261110/machinery')
tex=(root/'book/tikz/figures/agentic-substrate.tex').read_text()
svg=(root/'book/assets/agentic-substrate.svg').read_text()
(out/'before.tex').write_text(tex);(out/'before.svg').write_text(svg)
tex=tex.replace('{ENGINEERED ENVIRONMENT}', '{GOVERNED ENGINEERING ENVIRONMENT (GEE)}')
tex=tex.replace('(94,363) {Actions and\\\\changes}', '(94,345) {Actions and\\\\changes}')
tex=tex.replace('\\draw[-Stealth,line width=0.7pt] (160,403) -- (160,327);','\\draw[-Stealth,line width=0.7pt] (290,403) -- (290,327);')
tex=tex.replace('(220,363) {Guidance', '(358,363) {Guidance')
tex=tex.replace('\\draw[-Stealth,line width=0.85pt] (290,403) -- (290,327);','% Governance acts on the action boundary rather than entering the reasoner.\n\\draw[line width=1.25pt] (27,375) -- (43,375);\n\\draw[-Stealth,line width=0.85pt] (160,403) -- (160,375) -- (43,375);')
tex=tex.replace('(358,363) {Governance', '(220,363) {Governance')
tex=tex.replace('(390,539) -- (440,539) -- (440,65) -- (420,65);','(390,539) -- (440,539) -- (440,21) -- (278,21) -- (278,39);')
tex=tex.replace('Model training or fine-tuning (when available)','Training or fine-tuning (when feasible)')
svg=svg.replace('>ENGINEERED ENVIRONMENT</text>','>GOVERNED ENGINEERING ENVIRONMENT (GEE)</text>')
svg=svg.replace('x="94" y="360.3"','x="94" y="342.3"').replace('x="94" y="372.3"','x="94" y="354.3"')
svg=svg.replace('d="M 160 403 L 160 327"','d="M 290 403 L 290 327"')
for content in ['Guidance','Supplies system','knowledge; influences','reasoning']:
 svg=re.sub(r'(<text x=")220("[^>]*>'+re.escape(content)+r'</text>)',r'\g<1>358\2',svg)
svg=svg.replace('<path class="edge" d="M 290 403 L 290 327" stroke-width="0.85"/>','<!-- Governance targets the action boundary, not the agent input. -->\n<path d="M 27 375 H 43" fill="none" stroke="#000" stroke-width="1.25"/>\n<path class="edge" d="M 160 403 L 160 375 L 43 375" stroke-width="0.85"/>')
for content in ['Governance','Constrains actions;','controls acceptance','of selected results']:
 svg=re.sub(r'(<text x=")358("[^>]*>'+re.escape(content)+r'</text>)',r'\g<1>220\2',svg)
svg=svg.replace('d="M 390 539 L 440 539 L 440 65 L 420 65"','d="M 390 539 L 440 539 L 440 21 L 278 21 L 278 39"')
svg=svg.replace('Model training or fine-tuning (when available)','Training or fine-tuning (when feasible)')
svg=svg.replace('<path class="edge" d="M 390 539', '<path fill="none" class="edge" d="M 390 539')
old_desc=re.search(r'<desc id="desc">(.*?)</desc>',svg).group(1)
new_desc='Training data leads through pretraining and post-training to trained foundation-model weights. A deployed model provides four properties, each paired with an engineering implication, while the harness supplies tool action, context management, interposition and parallel execution. The agent changes an existing system. Guidance supplies system knowledge to the agent. Governance connects to the actions-and-changes boundary, constraining actions and controlling acceptance of selected results. The Governed Engineering Environment (GEE) contains the existing system and engineering structure. The engineer maintains this environment; an optional dashed training or fine-tuning route enters the pretraining and post-training process.'
svg=svg.replace(old_desc,new_desc)
(out/'agentic-substrate.tex').write_text(tex);(out/'agentic-substrate.svg').write_text(svg)
