#!/usr/bin/env python3
"""One geometry/label source for paired SVG and native TikZ.

Explicit geometry is required to preserve the user-supplied three-column
blueprint layout. Ordinary artifacts are white; gray table cells identify
model-name columns, not importance. Solid edges carry execution/structure;
dashed edges carry on-demand payload access or measurement feedback.
Native size 440 x 320 bp, 9 pt minimum text. TikZ inherits the house family.
"""
from pathlib import Path
from html import escape
import json
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--output-dir',type=Path,default=Path(__file__).resolve().parent)
OUT=parser.parse_args().output_dir
OUT.mkdir(parents=True,exist_ok=True)
KEY='handbook-resource-architecture'
TITLE='Resource-aware remediation execution'
ALT=('Streaming extraction separates an input document into a structural skeleton and external media payloads. '
     'The central execution path uses a computation graph, configured concurrency limits, active computations, '
     'and streamed recombination to produce an output document. Payload references resolve for active consumers '
     'and recombination, not for the graph itself. Measurements test the resource and performance models; '
     'a side table distinguishes residency, dependency, performance, and measurement roles.')
W,H=440,320

def tex(s):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','≤':r'$\leq$','•':r'\textbullet{}'}.get(c,c) for c in s)
class Drawing:
    def __init__(self):
        self.labels=[]
        self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="960" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc"><title id="title">{TITLE}</title><desc id="desc">{escape(ALT)}</desc><defs><marker id="arrow" markerWidth="4.5" markerHeight="4" refX="4.4" refY="2" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L4.5,2 L0,4 Z" fill="black"/></marker></defs><rect width="440" height="320" fill="white"/>']
        self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({W},{H});\n']
    def text(self,x,y,s,size=9,bold=False,anchor='middle',italic=False):
        self.labels.append({'text':s,'x':x,'y':y,'size':size,'bold':bold,'italic':italic})
        self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+'" font-style="'+('italic' if italic else 'normal')+f'" fill="black">{escape(s)}</text>')
        a={'start':'base west','middle':'base','end':'base east'}[anchor]
        self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{'+(r'\bfseries 'if bold else '')+(r'\itshape 'if italic else '')+f'\\fontsize{{{size}}}{{{size*1.15}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
    def line(self,pts,dash=False,arrow=True):
        self.s.append('<path d="'+' '.join(('M'if i==0 else'L')+f'{x},{y}'for i,(x,y)in enumerate(pts))+'" fill="none" stroke="black" stroke-width="0.75"'+(' stroke-dasharray="3 2"'if dash else'')+(' marker-end="url(#arrow)"'if arrow else'')+'/>')
        self.t.append(r'\draw[line width=.75bp'+(',dash pattern=on 3bp off 2bp'if dash else'')+(',-{Stealth[length=4.5bp,width=3.8bp]}'if arrow else'')+'] '+' -- '.join(f'({x},{y})'for x,y in pts)+';\n')
    def rect(self,x,y,w,h,gray=False,rx=0):
        self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="'+('#eeeeee'if gray else'white')+'" stroke="black" stroke-width=".75"/>')
        self.t.append(r'\path[fill='+('black!7'if gray else'white')+f',draw=black,line width=.75bp,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
    def box(self,x,y,w,h,title,lines=()):
        self.rect(x,y,w,h)
        if not lines:
            self.text(x+w/2,y+h/2+3.3,title,10.2,True)
        else:
            self.text(x+w/2,y+10.5,title,10.2,True)
            for i,s in enumerate(lines):self.text(x+8,y+21+9.3*i,'•  '+s,9,anchor='start')
    def save(self):
        (OUT/f'{KEY}.svg').write_text('\n'.join(self.s)+'</svg>\n')
        (OUT/f'{KEY}.tex').write_text(''.join(self.t)+r'\end{tikzpicture}'+'\n')
        (OUT/'labels.json').write_text(json.dumps(self.labels,indent=2)+'\n')

d=Drawing()
# Central connectors retain at least 12 bp terminal approach.
for y1,y2 in [(16,28),(61,77),(119,131),(173,185),(227,239),(272,284)]:
    d.line([(181,y1),(181,y2)])
d.line([(110,47),(48.5,47),(48.5,71)])
d.line([(252,47),(338,47),(338,71)])
d.line([(97,96),(110,96)])
# Payloads flow to active consumers and restoration, not to the graph.
d.line([(338,113),(338,125),(265,125),(265,207),(252,207)],dash=True)
d.line([(265,207),(265,255),(252,255)],dash=True)
d.line([(110,208),(95,208)],dash=True)
d.line([(90,236),(90,313),(359,313),(359,290)],dash=True)

d.box(120,0,122,16,'Input document')
d.box(110,28,142,33,'Streaming extraction',('Parse structure','Separate media payloads'))
d.box(0,71,97,42,'Structural skeleton',('XML / relationships','Document structure','Media references'))
d.box(278,71,120,42,'External media store',('Content hashes','Original media bytes','On-demand retrieval'))
d.box(110,77,142,42,'Computation graph',('Declared dependencies','Ready computations','Stable computation IDs'))
d.box(110,131,142,42,'Resource admission',('Memory envelope','Concurrency limit: active ≤ K','Cap calibrated to working set'))
d.box(110,185,142,42,'Active computations',('Execute permitted work','Bound active working set','Resolve needed media'))
d.box(110,239,142,33,'Streaming recombination',('Keep structural changes','Restore original media bytes'))
d.box(120,284,122,16,'Output document')
d.box(5,194,90,42,'Measurements',('Memory use','Latency / duration','Cost'))
d.text(44,269,'Test assumptions;',9,italic=True)
d.text(44,281,'revise models',9,italic=True)
d.text(279,121,'retrieve media',9,italic=True,anchor='start')

# The name column is gray; white description cells carry the uses.
d.rect(278,138,162,152)
d.text(359,151,'Models and their uses',10.2,True)
rows=[
    (['Residency','model'],['Bounds memory;','guides admission.']),
    (['Dependency','model'],['Defines ready work.']),
    (['Performance','model'],['Evaluates execution','policies.']),
    (['Measurements'],['Tests assumptions;','informs revision.']),
]
for i,(name,body) in enumerate(rows):
    y=159+i*31
    d.rect(283,y,68,27,gray=True)
    d.rect(351,y,84,27)
    for j,label in enumerate(name):d.text(317,y+16-(len(name)-1)*5+j*10,label,9,True)
    for j,label in enumerate(body):d.text(356,y+16-(len(body)-1)*5+j*10,label,9,anchor='start')
d.save()
(OUT/'caption.tex').write_text(r'''\emph{Resource-aware remediation execution.} Streaming extraction separates structure from media payloads. Dependency readiness identifies eligible work; concurrency limits, calibrated against the memory envelope, restrict active work. Consumers retrieve required media, and streamed recombination restores the original bytes. Measurements test the resource and performance models. Consumers that need whole-page or whole-slide renders require the visual content to remain available.'''+ '\n')
(OUT/'alt.txt').write_text(ALT+'\n')
