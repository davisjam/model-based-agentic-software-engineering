#!/usr/bin/env python3
"""Generate paired SVG and native TikZ for the Appendix B admission workflow.

One geometry preserves artifact/activity/decision/evidence distinctions in both
outputs. Source coordinates are print points; text remains at 10pt.
"""
from pathlib import Path
from html import escape
import argparse
OUTPUT_DIR=None
KEY='priority-to-accepted-work'
W,H=444,279
ALT='Priority, design, work order, agent implementation, acceptance gate and integrated work form one left-to-right workflow. Light-gray engineering models supply scope and context to the work order and model-derived obligations to the gate; independent acceptance evidence enters separately. Failed acceptance returns work for repair. Unresolved human judgment revises the design without bypassing acceptance. On interruption, durable commits and partial artifacts supply recovery, which inspects existing work before implementation resumes.'
# Compact vertical rails while preserving authored 10pt type.
def Y(y):
 # Translate whole node bands, never scale their internal typography or boxes.
 if y<60: return y
 if y<=106: return y-31
 if y<=180: return y-37
 return y-55

def tex(s):
 return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}'}.get(c,c) for c in s)
class Drawing:
 def __init__(self):
  self.labels=[]
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*3}" height="{H*3}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc"><title id="title">From priority to accepted work</title><desc id="desc">{escape(ALT)}</desc><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4.7" refY="2.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="black"/></marker></defs><rect width="{W}" height="{H}" fill="white"/>']
  self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({W},{H});\n']
 def text(self,x,y,s,size=10,bold=False,anchor='middle'):
  y=Y(y)
  self.labels.append((s,bold))
  self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+f'" fill="black">{escape(s)}</text>')
  a={'start':'base west','middle':'base','end':'base east'}[anchor]
  self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{'+(r'\bfseries ' if bold else '')+f'\\fontsize{{{size}}}{{{size*1.2}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
 def line(self,pts,dash=False,arrow=True):
  pts=[(x,Y(y)) for x,y in pts]
  self.s.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts))+'" fill="none" stroke="black" stroke-width=".8"'+(' stroke-dasharray="3 2"' if dash else '')+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
  self.t.append('\\draw[line width=.8bp'+(',dash pattern=on 3bp off 2bp' if dash else '')+(',-{Stealth[length=4.5bp,width=3.8bp]}' if arrow else '')+'] '+' -- '.join(f'({x},{y})' for x,y in pts)+';\n')
 def box(self,x,y,w,h,lines,activity=False,evidence=False,model=False):
  y0=y
  y=Y(y)
  rx=3 if activity or model else 0
  fill="#ebebeb" if model else "white"
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="black" stroke-width=".8"/>')
  self.t.append(f'\\path[fill={"black!8" if model else "white"},draw=black,line width=.8bp,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
  if evidence:
   self.s.append(f'<rect x="{x+3}" y="{y+3}" width="{w-6}" height="{h-6}" fill="white" stroke="black" stroke-width=".5"/>')
   self.t.append(f'\\path[fill=white,draw=black,line width=.5bp] ({x+3},{y+3}) rectangle ({x+w-3},{y+h-3});\n')
  if model:
   cx,cy=x+13,y+h/2
   for pts in [[(cx,cy-5.5),(cx,cy+5)],[(cx-6,cy+5),(cx-6,cy),(cx+6,cy),(cx+6,cy+5)]]:
    self.s.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{a},{b}' for i,(a,b) in enumerate(pts))+'" fill="none" stroke="black" stroke-width=".6"/>')
    self.t.append('\\draw[line width=.6bp] '+' -- '.join(f'({a},{b})' for a,b in pts)+';\n')
   for a,b in [(cx,cy-7),(cx-6,cy+6.5),(cx,cy+6.5),(cx+6,cy+6.5)]:
    self.s.append(f'<rect x="{a-1.5}" y="{b-1.5}" width="3" height="3" fill="white" stroke="black" stroke-width=".6"/>')
    self.t.append(f'\\path[draw,fill=white,line width=.6bp] ({a-1.5},{b-1.5}) rectangle ({a+1.5},{b+1.5});\n')
  for i,s in enumerate(lines):self.text(x+w/2+(9 if model else 0),y0+h/2-(len(lines)-1)*6+3.4+i*12,s)
 def diamond(self,cx,cy,w,h,lines):
  cy0=cy
  cy=Y(cy)
  pts=[(cx,cy-h/2),(cx+w/2,cy),(cx,cy+h/2),(cx-w/2,cy)]
  self.s.append('<polygon points="'+' '.join(f'{x},{y}'for x,y in pts)+'" fill="white" stroke="black" stroke-width=".8"/>')
  self.t.append('\\path[fill=white,draw=black,line width=.8bp] '+' -- '.join(f'({x},{y})' for x,y in pts)+' -- cycle;\n')
  for i,s in enumerate(lines):self.text(cx,cy0-(len(lines)-1)*6+3.4+i*12,s)
 def save(self):
  root=Path(__file__).resolve().parents[3] if OUTPUT_DIR is None else None
  svg_path=(root/f'book/assets/{KEY}.svg') if OUTPUT_DIR is None else OUTPUT_DIR/f'{KEY}.svg'
  tex_path=(root/f'book/tikz/figures/{KEY}.tex') if OUTPUT_DIR is None else OUTPUT_DIR/f'{KEY}.tex'
  svg_path.write_text('\n'.join(self.s)+'</svg>\n')
  tex_path.write_text(''.join(self.t)+'\\end{tikzpicture}\n')

def build():
 d=Drawing()
 # Primary progression is uninterrupted and always left-to-right.
 for a,b in [(42,56),(96,110),(166,180),(264,278),(364,378)]:
  d.line([(a,148),(b,148)])
 d.text(373,114,'accept')
 # Two distinct model roles, with selected context separate from obligations.
 d.line([(232,25),(250,25)],True)
 d.line([(151,50),(151,126)],True)
 d.text(143,94,'scope +',anchor='end');d.text(143,106,'context',anchor='end')
 d.line([(307,50),(307,125.5)],True)
 # Independent evidence enters its own gate port; it is not a producer claim.
 d.line([(407,50),(407,94),(335,94),(335,125.5)],True)
 # Failed acceptance returns to implementation. Unresolved judgment is separate.
 d.line([(303,166.6),(303,209),(254,209),(254,170)])
 d.text(280,202,'repair')
 d.line([(321,180),(321,230),(390,230),(390,266)])
 d.text(355,223,'unresolved')
 # Durable artifacts are a recovery resource, not another stage in the main row.
 d.line([(236,170),(236,242),(277,242),(277,266)])
 d.text(270,235,'if interrupted')
 d.line([(230,286),(214,286)])
 d.line([(168,266),(168,220),(210,220),(210,170)])
 d.text(187,213,'resume')
 # Human judgment informs a revised design; it never bypasses acceptance.
 d.line([(390,306),(390,326),(85,326),(85,170)])
 d.text(95,248,'revise design',anchor='start')
 d.box(122,0,110,50,['Engineering','models'],model=True)
 d.box(250,0,100,50,['Model-derived','obligations'],model=True)
 d.box(365,0,75,50,['Independent','acceptance','evidence'],evidence=True)
 d.box(0,126,42,44,['Priority'],activity=True)
 d.box(56,126,40,44,['Design'],activity=True)
 d.box(110,126,56,44,['Work','order'])
 d.box(180,126,84,44,['Agent','implementation'],activity=True)
 d.diamond(321,148,86,64,['Acceptance','gate'])
 d.box(378,126,62,44,['Integrated','work'])
 d.box(230,266,94,40,['Durable commits','+ partial artifacts'])
 d.box(122,266,92,40,['Recovery','inspect artifacts'],activity=True)
 d.box(341,266,99,40,['Human judgment'],activity=True)
 d.save()
 return d
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--output-dir',type=Path,default=None)
 args=parser.parse_args()
 OUTPUT_DIR=args.output_dir
 if OUTPUT_DIR is not None: OUTPUT_DIR.mkdir(parents=True,exist_ok=True)
 build()
