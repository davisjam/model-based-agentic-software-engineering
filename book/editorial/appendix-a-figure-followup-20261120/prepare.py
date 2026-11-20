#!/usr/bin/env python3
"""Refresh isolated figure receipts and review drafts, never shared registries."""
from pathlib import Path
import json, hashlib, importlib.util
ROOT=Path(__file__).resolve().parents[3]; HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('figures',HERE/'build.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);figs=m.build()
sha=lambda p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
reasons=[
'Author-approved simplification removes only the future authority-migration note; parity, live IAM and fix-forward distinctions remain.',
'Author-approved diagnostic-evidence label distinguishes advisory before-value comparison from selected admission guards; target-resolution width adjusts to give the edge label room.',
'Author-approved cleanup groups exactly two engines and places shared model selection outside that group. The capability input is prominent; acceptance visibly consumes findings and policy.',
'Author-approved moderate redraw aligns the two governance decisions with equal heavy diamonds. Independent checks produce review evidence; durable work also reaches completion review. Refusal, positive DONE and recovery semantics remain.',
'Author-approved dashed feedback returns model revision to component/dependency and validation-coverage models; recognized-gap fallback and challenge evidence retain their distinct roles.'
]
entries=[];(HERE/'receipts').mkdir(exist_ok=True)
for f,reason in zip(figs,reasons):
 src='book/assets/'+f.key+'.svg';cand='book/tikz/figures/'+f.key+'.tex';receipt='book/tikz/receipts/'+f.key+'.json'
 base={'source_sha256':sha(src),'candidate_sha256':sha(cand),'decision':'revised','revision_date':'2026-11-20','reviewed_visually':True,'previous_review':str((HERE/'before'/f'{f.key}.json').relative_to(ROOT))}
 row={'action':'replace','source':src,'asset_mapping':{'source':src,'pdf':'book/latex/assets/'+f.key+'-'+hashlib.sha256(src.encode()).hexdigest()[:10]+'.pdf'},'receipt':receipt}
 oldreceipt=json.loads((HERE/'before'/f'{f.key}.json').read_text());oldreceipt.update(base);oldreceipt.update(topology=f.alt,required_terms=[s for s,b in f.labels],alt=f.alt,redesign=reason,generator=str((HERE/'build.py').relative_to(ROOT)),questions=[],review_scope='Isolated five-page native proof, source SVG check and visual inspection; parent performs integrated pool and book builds.')
 (HERE/'receipts'/f'{f.key}.json').write_text(json.dumps(oldreceipt,indent=2,ensure_ascii=False)+'\n')
 for name in ['inventory','layout-review','typography-review','style-review','fidelity-review','grayscale-review']:
  d=json.loads((HERE/'before'/f'{f.key}-{name}.json').read_text())
  if name=='inventory':d.update(generator=str((HERE/'build.py').relative_to(ROOT)),svg_title=f.title,svg_description=f.alt,conversion=reason)
  else:d.update(base);d['reason']=reason
  if name=='typography-review':
   d['checks']=[{'text':s,'bold':b,'italic':False}for s,b in f.labels]
   d['evidence']=[{'source_text':s,'source_style':{'font-size':'10','font-weight':'700'if b else'400','font-style':'normal'},'semantic_role':'heading'if b else'model, mechanism, evidence or relation label','candidate_text':s,'candidate_style':'bold'if b else'regular'}for s,b in f.labels]
  if name=='style-review':d.update(routing=f.alt,visual_review='Inspected synchronized SVG and native geometry; labels fit at print size. Shape, grayscale, evidence and authority meanings checked against the author-requested relationships.')
  if name=='fidelity-review':d.update(links_and_groups=f.alt,preserved=[s for s,b in f.labels])
  row[name]=d
 pub=json.loads((ROOT/'book/tikz/publication.json').read_text())['approved_monochrome'][src].copy();pub.update(candidate_sha256=sha(cand),approved_date='2026-11-20',reason=reason);row['publication']=pub
 entries.append(row)
(HERE/'registry-additions.json').write_text(json.dumps(entries,indent=2,ensure_ascii=False)+'\n')
print('Prepared five isolated replacement rows and receipts; shared files unchanged.')
