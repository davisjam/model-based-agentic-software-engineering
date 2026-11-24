#!/usr/bin/env python3
"""A.7 paired SVG/TikZ, one geometry. User-approved bespoke layout.

Adapted from book/editorial/appendix-a-figure-followup-20261120/build.py.
Manual geometry preserves the requested two-column plate and lower-right legend;
auto-layout would not preserve the target. White fill, square boxes, bold role
headings. Solid = declaration/projection/consumption; dashed = correspondence.
"""
from pathlib import Path
from html import escape
import argparse
import json

KEY='handbook-computation-architecture'
TITLE='Computation declarations and their consumers'
ALT=('Office registry declarations feed scheduling and an edge emitter; only the '
     'emitter supplies the Office analytical graph. PDF typed declarations project '
     'the PDF analytical graph. Dashed checks compare the executable population '
     'with declarations and the analytical graph. Both graphs support dependency '
     'queries, critical-path analysis, mutation classification, and measurement '
     'or coverage. ShouldRun is an execution-applicability condition.')

def tex(s):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_',
                    '{':r'\{','}':r'\}'}.get(c,c) for c in s)

class Drawing:
    def __init__(self,w=440,h=313):
        self.w,self.h=w,h
        self.labels=[]
        self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="939" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{KEY}-title {KEY}-desc"><title id="{KEY}-title">{TITLE}</title><desc id="{KEY}-desc">{escape(ALT)}</desc><defs><marker id="{KEY}-arrow" markerWidth="5" markerHeight="5" refX="4.7" refY="2.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="black"/></marker></defs><rect width="{w}" height="{h}" fill="white"/>']
        self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n', f'\\path[use as bounding box] (0,0) rectangle ({w},{h});\n']
    def text(self,x,y,s,size=9.5,bold=False,anchor='middle'):
        self.labels.append({'text':s,'style':'bold' if bold else 'regular','size_pt':size})
        self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+f'" fill="black">{escape(s)}</text>')
        a={'start':'base west','middle':'base','end':'base east'}[anchor]
        self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{'+(r'\bfseries ' if bold else '')+f'\\fontsize{{{size}}}{{{size*1.2}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
    def line(self,pts,dash=False,arrow=True,both=False):
        self.s.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts))+'" fill="none" stroke="black" stroke-width="0.8"'+(' stroke-dasharray="3 2"' if dash else '')+(f' marker-end="url(#{KEY}-arrow)"' if arrow else '')+(f' marker-start="url(#{KEY}-arrow)"' if both else '')+'/>')
        opt=',dash pattern=on 3bp off 2bp' if dash else ''
        if both: opt+=',{Stealth[length=4.5bp,width=3.8bp]}-{Stealth[length=4.5bp,width=3.8bp]}'
        elif arrow: opt+=',-{Stealth[length=4.5bp,width=3.8bp]}'
        self.t.append('\\draw[line width=.8bp'+opt+'] '+' -- '.join(f'({x},{y})' for x,y in pts)+';\n')
    def rect(self,x,y,w,h):
        self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="white" stroke="black" stroke-width=".8"/>')
        self.t.append(f'\\path[fill=white,draw=black,line width=.8bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
    def bullet(self,x,y,s):
        self.text(x,y,'•',anchor='start')
        self.text(x+7,y,s,anchor='start')
    def save(self,out):
        out.mkdir(parents=True,exist_ok=True)
        (out/(KEY+'.svg')).write_text('\n'.join(self.s)+'</svg>\n')
        (out/'typography-labels.json').write_text(json.dumps(self.labels,indent=2)+'\n')
        (out/(KEY+'.tex')).write_text(''.join(self.t)+'\\end{tikzpicture}\n')


def build(out):
    d=Drawing()
    # Shared rails, drawn before boxes. All final arrow approaches >=12bp.
    d.line([(80,94),(80,105),(37.5,105),(37.5,117)])
    d.line([(80,105),(132,105),(132,117)])
    d.line([(132,168),(132,181),(94,181),(94,193)])
    # Only typed declarations feed PDF projection; population check stays dashed.
    d.line([(290,64),(320,64)],dash=True,both=True)
    d.line([(237.5,94),(237.5,180),(223,180),(223,193)],dash=True,both=True)
    d.line([(384,94),(384,106),(282,106),(282,193)])
    d.line([(94,244),(94,256),(189.5,256),(189.5,269)])
    d.line([(271,244),(271,256),(189.5,256)],arrow=False)
    # Column labels and source representations.
    d.text(80,14,'OFFICE',size=12.5,bold=True)
    d.text(317,14,'PDF',size=12.5,bold=True)
    d.rect(5,23,151,71)
    d.text(80.5,36,'Computation registry',size=10.5,bold=True)
    for y,s in [(49,'Identity (stable name)'),(60,'Reads / writes (artifacts)'),(71,'Before / after (order)'),(82,'ShouldRun (applicability)')]: d.bullet(15,y,s)
    d.rect(185,23,105,71)
    d.text(237.5,36,'Executable pipeline',size=10.5,bold=True)
    for y,s in [(49,'Registered passes'),(60,'Execution order'),(71,'Implementation')]: d.bullet(193,y,s)
    d.text(200,82,'bindings',anchor='start')
    d.rect(320,23,118,71)
    d.text(379,36,'Typed declarations',size=10.5,bold=True)
    for y,s in [(49,'Produces (artifacts)'),(60,'Consumes (inputs)'),(71,'ConsumesForControl')]: d.bullet(328,y,s)
    d.text(335,82,'(control inputs)',anchor='start')
    # Two distinct Office consumers. Scheduler has no edge to the analytical graph.
    d.rect(0.5,117,75,51)
    d.text(38,129,'Scheduler',size=10.5,bold=True)
    d.bullet(7,143,'Order work')
    d.bullet(7,154,'Check')
    d.text(14,165,'applicability',anchor='start')
    d.rect(87,117,90,51)
    d.text(132,129,'Edge emitter',size=10.5,bold=True)
    d.bullet(95,143,'Project')
    d.text(102,154,'dependencies',anchor='start')
    d.text(102,165,'(for analysis)',anchor='start')
    for x,fmt in [(28,'Office'),(205,'PDF')]:
        d.rect(x,193,132,51)
        d.text(x+66,205,'Analytical graph',size=10.5,bold=True)
        d.text(x+66,216,f'({fmt})',size=10,bold=True)
        d.bullet(x+8,229,'Computations and edges')
        d.bullet(x+8,240,'Stable computation IDs')
    d.rect(49,269,281,43)
    d.text(189.5,282,'Shared analytical uses',size=10.5,bold=True)
    d.bullet(61,295,'Dependency queries')
    d.bullet(61,307,'Critical-path analysis')
    d.bullet(192,295,'Mutation classification')
    d.bullet(192,307,'Measurement / coverage')
    # Lower-right legend retains the target's grouping and compact footprint.
    d.rect(346,193,93.5,89)
    d.text(354,207,'Legend',size=10.5,bold=True,anchor='start')
    d.line([(351,224),(369,224)])
    d.text(374,220,'Projection /',size=9,anchor='start')
    d.text(374,231,'consumption',size=9,anchor='start')
    d.line([(351,247),(369,247)],dash=True,both=True)
    d.text(374,243,'Correspondence',size=9,anchor='start')
    d.text(374,254,'check',size=9,anchor='start')
    d.text(354,266,'(does not perform',size=9,anchor='start')
    d.text(354,277,'remediation)',size=9,anchor='start')
    d.save(out)
    (out/'caption.txt').write_text('Computation declarations and their consumers. Office registry metadata supplies execution ordering and a separate analytical projection; the scheduler does not consume or supply the analytical graph. PDF typed declarations project analytical dependencies, with separate correspondence checks against executable computations. Stable computation identities support shared analyses. Population coverage and agreement among declarations remain separate obligations.\n')
    (out/'alt.txt').write_text(ALT+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output','--output-dir',dest='output',type=Path,default=Path(__file__).resolve().parent)
    build(p.parse_args().output)
