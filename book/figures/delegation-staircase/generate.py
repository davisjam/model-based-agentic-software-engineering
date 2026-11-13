#!/usr/bin/env python3
"""Generate the three-stage delegation staircase in native TikZ and SVG."""
from pathlib import Path
import json,html
r=Path(__file__).resolve().parents[3]
def rect(x,y,w,h,gray=False,rad=4,thin=False):
 tex.append(r'\draw[draw='+('black!45' if thin else 'black')+',fill='+('black!5' if gray else 'white')+r',line width='+('.45' if thin else '.7')+'pt,rounded corners='+str(rad)+f'pt] ({x},{y}) rectangle ({x+w},{y+h});')
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="'+('#f2f2f2' if gray else 'white')+'" stroke="'+('#888' if thin else '#111')+'" stroke-width="'+('.45' if thin else '.7')+'"/>')
def txt(x,y,t,size=9,bold=False,italic=False,left=False,tt=None):
 s=tt if tt is not None else t
 tex.append(r'\node[anchor='+('base west' if left else 'base')+r',inner sep=0pt,font=\magefigurefont\fontsize{'+str(size)+r'}{11}\selectfont'+(r'\bfseries' if bold else '')+(r'\itshape' if italic else '')+f'] at ({x},{y}) '+'{'+s+'};')
 svg.append(f'<text x="{x}" y="{y}" text-anchor="'+('start' if left else 'middle')+f'" font-size="{size}"'+(' font-weight="700"' if bold else '')+(' font-style="italic"' if italic else '')+'>'+html.escape(t)+'</text>')
 if tt is None:checks.append({'text':t,'bold':bold,'italic':italic})
def line(pts,arrow=False,width=.7,gray=False):
 tex.append(r'\draw['+('->,' if arrow else '')+('draw=black!45,' if gray else '')+f'line width={width}pt] '+' -- '.join(f'({x},{y})' for x,y in pts)+';')
 svg.append('<path d="'+' '.join(('M' if i==0 else 'L')+str(x)+' '+str(y) for i,(x,y) in enumerate(pts))+'" fill="none" stroke="'+('#888' if gray else '#111')+f'" stroke-width="{width}"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
def stack(x,y,w,h):
 rect(x+4,y-4,w,h);rect(x+2,y-2,w,h);rect(x,y,w,h)

tex=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Latex,font=\magefigurefont\fontsize{9}{11}\selectfont]',r'\hyphenpenalty=10000']
alt='Three ascending staircase shelves show Co-coder with an ordinary repository; Tech lead with agent review, deterministic checks, ownership zones, and boundary rules; Architect with system models, traceability, and controls. A rising GEE-capability arrow identifies the accumulated models, checks, and controls. Aligned responsibilities progress from reading, judging, and admitting changes to directing work and resolving exceptions, then deciding system structure, consequential obligations, and strategy.'
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 446 260" width="446" height="260" role="img" aria-labelledby="title desc" font-family="\'Source Sans 3\', sans-serif">','<title id="title">DocAble’s delegation staircase</title>','<desc id="desc">'+alt+'</desc>'];checks=[]
def polygon(points,fill='black!5',color='#f2f2f2',stroke=True):
 tex.append(r'\path[fill='+fill+(',draw=black,line width=.8pt' if stroke else '')+'] '+' -- '.join(f'({x},{y})' for x,y in points)+' -- cycle;')
 svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in points)+'" fill="'+color+'"'+(' stroke="#111" stroke-width=".8"' if stroke else '')+'/>')
# Capability arrow, an open-bottom shaft matching the author’s reference.
polygon([(14,253),(14,49),(6,49),(38,17),(70,49),(62,49),(62,253)],stroke=False)
line([(14,253),(14,49),(6,49),(38,17),(70,49),(62,49),(62,253)],width=.85)
txt(38,86,'GEE',11,True,True);txt(38,99,'capability',10,True,True)
for y,t in [(120,'(models,'),(132,'checks,'),(144,'and'),(156,'controls)')]:txt(38,y,t,9.5,italic=True)
# One qualitative staircase, open on its right edge.
polygon([(68,253),(68,188),(105,188),(105,119),(142,119),(142,54),(312,54),(312,253)],fill='black!2',color='#fafafa',stroke=False)
for x,top,bottom in [(142,54,119),(105,119,188),(68,188,253)]:
 tex.append(r'\draw[line width=1pt,rounded corners=5pt] '+f'(312,{top}) -- ({x},{top}) -- ({x},{bottom}) -- (312,{bottom});')
 svg.append(f'<path d="M312 {top} H{x+5} Q{x} {top} {x} {top+5} V{bottom-5} Q{x} {bottom} {x+5} {bottom} H312" fill="none" stroke="#111" stroke-width="1"/>')
line([(320,54),(320,253)],width=.45)
txt(256,25,'MY ROLE',13,True)
txt(155,75,'3. ARCHITECT',12,True,left=True);txt(155,92,'System models, traceability,',9.5,left=True);txt(155,105,'and controls',9.5,left=True)
txt(119,141,'2. TECH LEAD',12,True,left=True);txt(119,159,'Agent review, deterministic checks,',9.5,left=True);txt(119,172,'ownership zones, and boundary rules',9.5,left=True)
txt(82,211,'1. CO-CODER',12,True,left=True);txt(82,230,'Ordinary repository',10,left=True)
for y,t in [(74,'Decide system structure,'),(88,'consequential obligations,'),(102,'and strategy'),(148,'Direct work and'),(162,'resolve exceptions'),(211,'Read, judge, and'),(225,'admit changes')]:txt(330,y,t,9.5,left=True)
tex.append(r'\end{tikzpicture}');svg.append('</svg>')
(r/'book/tikz/figures/mage-staircase.tex').write_text('\n'.join(tex)+'\n');(r/'book/assets/mage-staircase.svg').write_text('\n'.join(svg)+'\n')
f=r/'book/tikz/typography-review.json';d=json.loads(f.read_text());next(x for x in d['figures'] if x['source']=='book/assets/mage-staircase.svg')['checks']=checks;f.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
f=r/'book/tikz/layout-review.json';d=json.loads(f.read_text());next(x for x in d['figures'] if x['source']=='book/assets/mage-staircase.svg')['contracts']={};f.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
